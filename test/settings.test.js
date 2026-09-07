// Settings are the boundary between the host's browser and the game engine.
// The rule the project states explicitly: unknown or out-of-range values are
// DROPPED, never clamped — so a bad value falls back to the default rather than
// quietly becoming a different valid one.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, loadSettingsSchema } = require('./helpers');

const GAMES = ['tictactoe', 'killerdoctor', 'scribble', 'uno', 'quiz', 'connect4', 'undercover', 'rps'];

test('every game has default settings', () => {
  for (const game of GAMES) {
    const defaults = app.defaultSettings(game);
    assert.equal(typeof defaults, 'object', `${game} defaults`);
    assert.notEqual(defaults, null);
  }
  assert.deepEqual(app.defaultSettings('nope'), {}, 'unknown game falls back to no settings');
});

test('every game declares a minimum player count', () => {
  for (const game of GAMES) {
    const min = app.minPlayers(game);
    assert.ok(Number.isInteger(min) && min >= 2, `${game} min players: ${min}`);
  }
  assert.equal(app.minPlayers('nope'), 2, 'unknown game falls back to 2');
});

test('unknown keys are dropped', () => {
  for (const game of GAMES) {
    const out = app.validateSettings({ nonsense: 42, __proto__: 'x' }, game);
    assert.deepEqual(Object.keys(out).filter(k => k === 'nonsense'), [], `${game} kept an unknown key`);
  }
});

test('out-of-range values are dropped, not clamped', () => {
  const cases = [
    ['tictactoe', { bestOf: 4, boardSize: 9 }],
    ['connect4', { bestOf: 2, cols: 40, rows: 1 }],
    ['undercover', { undercoverCount: 5, mrWhite: 7, clueTime: 3, votingTime: 5000 }],
    ['rps', { bestOf: 2, roundTime: 1 }],
    ['quiz', { numQuestions: 999, timePerQuestion: 1 }],
    ['scribble', { rounds: 99, wordChoices: 0, drawTime: 5 }],
    ['killerdoctor', { discussionTime: 1, votingTime: 9999, nightTime: 0 }],
  ];
  for (const [game, bad] of cases) {
    assert.deepEqual(app.validateSettings(bad, game), {}, `${game} should have dropped every value`);
  }
});

test('valid values survive validation unchanged', () => {
  assert.deepEqual(app.validateSettings({ bestOf: 5, boardSize: 4 }, 'tictactoe'), { bestOf: 5, boardSize: 4 });
  assert.deepEqual(app.validateSettings({ bestOf: 0, cols: 9, rows: 7 }, 'connect4'), { bestOf: 0, cols: 9, rows: 7 });
  assert.deepEqual(app.validateSettings({ bestOf: 7, roundTime: 20 }, 'rps'), { bestOf: 7, roundTime: 20 });
  assert.deepEqual(
    app.validateSettings({ undercoverCount: 2, mrWhite: 0, clueTime: 45, votingTime: 60 }, 'undercover'),
    { undercoverCount: 2, mrWhite: 0, clueTime: 45, votingTime: 60 },
  );
});

test('numeric strings from a <select> are accepted', () => {
  // Every value the lobby sends arrives as a string; validateSettings has to
  // coerce before comparing or the host's choice is silently discarded.
  assert.deepEqual(app.validateSettings({ bestOf: '5' }, 'tictactoe'), { bestOf: 5 });
  assert.deepEqual(app.validateSettings({ mrWhite: '0' }, 'undercover'), { mrWhite: 0 });
});

test('uno takes no settings at all', () => {
  assert.deepEqual(app.validateSettings({ bestOf: 3, anything: 1 }, 'uno'), {});
});

// The trap CLAUDE.md calls out by name: the lobby renders SETTINGS_SCHEMA, the
// server validates against its own list, and nothing ties the two together. If
// they drift, the host picks a value the server throws away without a word.
test('every option offered by the lobby is accepted by the server', () => {
  const schema = loadSettingsSchema();
  for (const [game, fields] of Object.entries(schema)) {
    for (const field of fields) {
      for (const opt of field.options || []) {
        const accepted = app.validateSettings({ [field.id]: opt.v }, game);
        assert.equal(
          accepted[field.id], Number(opt.v),
          `${game}.${field.id} = ${opt.v} is offered in the lobby but rejected by validateSettings()`,
        );
      }
    }
  }
});

test('every settings field has a game the server knows about', () => {
  const schema = loadSettingsSchema();
  for (const game of Object.keys(schema)) {
    assert.ok(GAMES.includes(game), `SETTINGS_SCHEMA has an entry for unknown game "${game}"`);
  }
});

test('each schema default is itself a valid value', () => {
  const schema = loadSettingsSchema();
  for (const [game, fields] of Object.entries(schema)) {
    for (const field of fields) {
      const accepted = app.validateSettings({ [field.id]: field.default }, game);
      assert.equal(accepted[field.id], Number(field.default), `${game}.${field.id} default is rejected`);
    }
  }
});
