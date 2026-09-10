// Shared scaffolding for the test suite.
//
// `require('../server.js')` gives us the real game functions: the listen block is
// behind a `require.main === module` guard, so nothing binds a port here.
//
// The phase machines are driven by calling their phase functions directly rather
// than by waiting on timers — a clue round is 30 real seconds. Every test that
// starts a game must still call `stopTimers(room)` when it is done, or the
// pending setTimeout keeps the test runner alive.
const fs = require('fs');
const path = require('path');

const app = require('../server.js');

/**
 * A room shaped exactly like the one `room:create` builds, with `n` fake players.
 * Player ids are `p1`…`pn` so tests can name them without going through sockets.
 */
function makeRoom(gameType, n, settings = {}) {
  const players = new Map();
  for (let i = 1; i <= n; i++) {
    players.set('p' + i, { id: 'p' + i, name: 'P' + i, avatar: i });
  }
  return {
    code: 'TEST01',
    gameType,
    host: 'p1',
    players,
    status: 'playing',
    gameState: null,
    timers: [],
    settings: { ...app.defaultSettings(gameType), ...settings },
    sessionStats: {},
  };
}

/** A stand-in for a connected socket. Everything it is sent is recorded. */
function sock(id) {
  const sent = [];
  const relayed = [];
  return {
    id,
    sent,
    emit(ev, payload) { sent.push({ ev, payload }); },
    received(ev) { return sent.filter(m => m.ev === ev).map(m => m.payload); },
    // `socket.to(room)` is "everyone but me" — Scribble relays strokes that way so
    // the drawer is not sent back what they just drew.
    relayed,
    to(target) { return { emit(ev, payload) { relayed.push({ target, ev, payload }); } }; },
    relayedTo(ev) { return relayed.filter(m => m.ev === ev).map(m => m.payload); },
  };
}

/** Drops every timer the room has pending. Call it at the end of any test that started a game. */
function stopTimers(room) { app.clearTimers(room); }

/**
 * Records every `io.to(target).emit(...)` the server makes.
 *
 * This is how "secrets never enter the public state" is actually checked: a
 * projection function can look right while a broadcast leaks. Always paired
 * with `restore()`, or the next test file inherits a patched io.
 */
function captureBroadcasts() {
  const sent = [];
  const original = app.io.to;
  app.io.to = target => ({
    emit(ev, payload) { sent.push({ target, ev, payload }); },
  });
  return {
    sent,
    to(target) { return sent.filter(m => m.target === target); },
    of(ev) { return sent.filter(m => m.ev === ev).map(m => m.payload); },
    /** Everything broadcast to the room, as one searchable string. */
    roomText(code) {
      return JSON.stringify(sent.filter(m => m.target === code).map(m => m.payload));
    },
    restore() { app.io.to = original; },
  };
}

/** The lobby's settings schema, read out of the browser bundle. */
function loadSettingsSchema() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  const start = src.indexOf('const SETTINGS_SCHEMA = {');
  if (start < 0) throw new Error('SETTINGS_SCHEMA not found in public/js/app.js');
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return new Function('return ' + src.slice(open, i + 1))();
    }
  }
  throw new Error('SETTINGS_SCHEMA literal is unbalanced');
}

module.exports = { app, makeRoom, sock, stopTimers, captureBroadcasts, loadSettingsSchema };
