// Undo works in *gestures*, not in log entries: the stroke log is flat
// (`begin, point, point…, end`), so removing "the last thing" naively would rub
// out one pixel of a line and leave the rest. And because a raster canvas cannot
// un-draw, the server owns the log and every client repaints from it — so undo
// has to be right on the server or the room's canvases diverge.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, makeRoom, sock, stopTimers, captureBroadcasts } = require('./helpers');

/** A finished pencil stroke of `points` points. */
const stroke = (points = 2) => [
  { type: 'begin', nx: 0.1, ny: 0.1, color: '#000', size: 5, tool: 'pencil' },
  ...Array.from({ length: points }, (_, i) => ({ type: 'point', nx: 0.2 + i / 100, ny: 0.2 })),
  { type: 'end' },
];
const fill = () => ({ type: 'fill', nx: 0.5, ny: 0.5, color: '#ef4444' });
const clear = () => ({ type: 'clear' });

test('undoing a stroke removes the whole gesture, not one point of it', () => {
  const log = [...stroke(3), ...stroke(4)];
  const after = app.scribbleUndoLast(log);
  assert.deepEqual(after, stroke(3).map((s, i) => log[i]), 'the first stroke survives intact');
  assert.equal(after.length, 5, 'begin + 3 points + end');
  assert.equal(app.scribbleUndoLast(after).length, 0, 'undoing again empties the log');
});

test('a fill and a clear are one gesture each', () => {
  assert.deepEqual(app.scribbleUndoLast([fill()]), []);
  assert.deepEqual(app.scribbleUndoLast([clear()]), []);

  // A fill on top of a stroke: undo takes the fill and leaves the stroke.
  const log = [...stroke(2), fill()];
  const after = app.scribbleUndoLast(log);
  assert.equal(after.length, 4);
  assert.equal(after[after.length - 1].type, 'end');
});

test('a clear can be undone — which is the whole reason it is logged', () => {
  // Clearing used to empty `drawingData`, so the drawing was gone for good. An
  // accidental Clear is exactly when undo matters most.
  const log = [...stroke(2), clear()];
  const after = app.scribbleUndoLast(log);
  assert.deepEqual(after, log.slice(0, 4), 'the strokes are still in the log after undoing the clear');
});

test('an unfinished stroke undoes like any other', () => {
  // The drawer is mid-gesture: a `begin` and some points, no `end` yet.
  const log = [...stroke(2), { type: 'begin', nx: 0.7, ny: 0.7, color: '#000', size: 5 }, { type: 'point', nx: 0.8, ny: 0.8 }];
  assert.equal(app.scribbleUndoLast(log).length, 4, 'only the finished stroke is left');
});

test('there is nothing to undo on an empty or malformed log', () => {
  assert.equal(app.scribbleUndoLast([]), null);
  assert.equal(app.scribbleUndoLast(undefined), null);
  // Points with no `begin` cannot happen through the client, and guessing where
  // the gesture started would rub out an unrelated amount of drawing.
  assert.equal(app.scribbleUndoLast([{ type: 'point', nx: 0.1, ny: 0.1 }]), null);
});

test('the action count matches what undo can actually remove', () => {
  const log = [...stroke(3), fill(), ...stroke(2), clear()];
  assert.equal(app.scribbleActionCount(log), 4, 'two strokes, one fill, one clear');

  // Counting down to zero by undoing must land exactly on an empty log.
  let cur = log;
  for (let n = 4; n > 0; n--) {
    assert.equal(app.scribbleActionCount(cur), n);
    cur = app.scribbleUndoLast(cur);
  }
  assert.equal(cur.length, 0);
  assert.equal(app.scribbleActionCount(cur), 0);
  assert.equal(app.scribbleUndoLast(cur), null);
});

// ─── Through the real dispatch ───

/** A scribble room mid-turn, with `p1` drawing. Caller must `stopTimers`. */
function drawingRoom() {
  const room = makeRoom('scribble', 3);
  app.startScribble(room);
  app.clearTimers(room);
  const gs = room.gameState;
  gs.drawerIndex = gs.drawerOrder.indexOf('p1');
  gs.phase = 'drawing';
  gs.drawingData = [...stroke(3), ...stroke(2)];
  app.rooms.set(room.code, room);
  return room;
}

test('undo is the drawer\'s, and only while they are drawing', () => {
  const room = drawingRoom();
  const before = room.gameState.drawingData.length;
  try {
    // A guesser cannot rub out the drawer's work with a hand-made action.
    app.handleAction(room, sock('p2'), { action: 'undo' });
    assert.equal(room.gameState.drawingData.length, before, 'a non-drawer undo is ignored');

    // Nor can the drawer, once the round is over and the word is on screen.
    room.gameState.phase = 'round_end';
    app.handleAction(room, sock('p1'), { action: 'undo' });
    assert.equal(room.gameState.drawingData.length, before, 'undo is refused outside the drawing phase');

    room.gameState.phase = 'drawing';
    app.handleAction(room, sock('p1'), { action: 'undo' });
    assert.equal(room.gameState.drawingData.length, 5, 'the drawer undoes their last stroke');
  } finally {
    stopTimers(room);
    app.rooms.delete(room.code);
  }
});

test('an undo repaints the whole room, drawer included', () => {
  const room = drawingRoom();
  const bus = captureBroadcasts();
  try {
    app.handleAction(room, sock('p1'), { action: 'undo' });
    const redraws = bus.of('scribble:redraw');
    assert.equal(redraws.length, 1, 'exactly one redraw per undo');
    // `io.to(room)` and not `socket.to(room)`: the drawer's own canvas is raster
    // too, so it cannot un-draw the line either.
    assert.deepEqual(bus.to(room.code).map(m => m.ev), ['scribble:redraw']);
    assert.equal(redraws[0].drawingData.length, 5);
    assert.equal(redraws[0].actions, 1, 'the client needs the count to disable the button');
  } finally {
    bus.restore();
    stopTimers(room);
    app.rooms.delete(room.code);
  }
});

test('a clear is logged rather than dropping the drawing', () => {
  const room = drawingRoom();
  try {
    app.handleAction(room, sock('p1'), { action: 'clear' });
    const log = room.gameState.drawingData;
    assert.equal(log.length, 10, 'the two strokes are still there, plus the clear marker');
    assert.equal(log[log.length - 1].type, 'clear');

    app.handleAction(room, sock('p1'), { action: 'undo' });
    assert.equal(room.gameState.drawingData.length, 9, 'undoing the clear brings the drawing back');
  } finally {
    stopTimers(room);
    app.rooms.delete(room.code);
  }
});

// The fill entry the server stored used `x`/`y` while the client replayed
// `nx`/`ny`, so every remote and replayed fill resolved to NaN and silently did
// nothing. Undo made it visible: it repaints from the log, so a broken fill in
// the log became a fill that vanished on undo.
test('a fill is logged in the same normalised coordinates a replay reads', () => {
  const room = drawingRoom();
  try {
    app.handleAction(room, sock('p1'), { action: 'fill', nx: 0.25, ny: 0.75, color: '#22c55e' });
    const entry = room.gameState.drawingData[room.gameState.drawingData.length - 1];
    assert.deepEqual(entry, { type: 'fill', nx: 0.25, ny: 0.75, color: '#22c55e' });
    assert.ok(!('x' in entry) && !('y' in entry),
      'the client replays nx/ny — an x/y entry replays as NaN and draws nothing');
  } finally {
    stopTimers(room);
    app.rooms.delete(room.code);
  }
});

test('a reconnecting drawer gets their undo count back', () => {
  const room = drawingRoom();
  const s = sock('p1');
  try {
    app.sendReconnectState(room, s);
    const [state] = s.received('scribble:reconnect');
    assert.equal(state.actions, 2, 'two strokes are on the canvas, so two can be undone');
    assert.equal(state.drawingData.length, 9, 'begin+3+end, then begin+2+end');
  } finally {
    stopTimers(room);
    app.rooms.delete(room.code);
  }
});
