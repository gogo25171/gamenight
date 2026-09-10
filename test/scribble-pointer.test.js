// The bug: the drawer's ink landed beside the cursor, further off the closer you
// got to an edge — enough to make Scribble unusable.
//
// Cause: the canvas bitmap is a fixed 800×500 while the flex layout stretches its
// box freely, and `object-fit: contain` fits the bitmap inside that box without
// distorting it. The old mapping scaled each axis by the *box*, ignoring the
// letterbox bars the fit leaves behind.
//
// `pointerToBitmap()` is pure maths with no DOM in it, precisely so it can be
// checked here. The suite has no browser, so the function is lifted out of the
// source and evaluated on its own — the same trick the BETA-badge test uses to
// read the client without running it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const src = fs.readFileSync(path.join(PUBLIC, 'js', 'scribble.js'), 'utf8');
const css = fs.readFileSync(path.join(PUBLIC, 'style.css'), 'utf8');

/** Pulls one top-level-in-the-IIFE function out of scribble.js and compiles it. */
function lift(name) {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start > 0, `${name}() not found in public/js/scribble.js`);
  // Functions in that file are indented two spaces, so the first "\n  }" closes it.
  const end = src.indexOf('\n  }', start);
  assert.ok(end > start, `could not find the end of ${name}()`);
  return new Function(`return (${src.slice(start, end + 4)});`)();
}

const pointerToBitmap = lift('pointerToBitmap');

const BMP = { w: 800, h: 500 };
const rect = (left, top, width, height) => ({ left, top, width, height });
const at = (r, x, y) => pointerToBitmap(r, BMP.w, BMP.h, x, y);
const near = (actual, expected, what) =>
  assert.ok(Math.abs(actual - expected) < 0.001, `${what}: expected ~${expected}, got ${actual}`);

test('a box with the bitmap aspect ratio maps corner to corner', () => {
  const r = rect(0, 0, 800, 500);
  near(at(r, 0, 0).x, 0, 'top-left x');
  near(at(r, 0, 0).y, 0, 'top-left y');
  near(at(r, 800, 500).x, 800, 'bottom-right x');
  near(at(r, 800, 500).y, 500, 'bottom-right y');
});

test('a uniformly scaled box still maps corner to corner', () => {
  const r = rect(0, 0, 1600, 1000);  // same 1.6 ratio, twice the size
  near(at(r, 800, 500).x, 400, 'centre x');
  near(at(r, 800, 500).y, 250, 'centre y');
  near(at(r, 1600, 1000).x, 800, 'bottom-right x');
});

test('the box offset on the page is subtracted', () => {
  const r = rect(180, 60, 800, 500);  // sidebar 180 wide, top bar 60 tall
  near(at(r, 180, 60).x, 0, 'x at the box origin');
  near(at(r, 180, 60).y, 0, 'y at the box origin');
  near(at(r, 380, 160).x, 200, 'x mid-canvas');
  near(at(r, 380, 160).y, 100, 'y mid-canvas');
});

test('a box wider than the bitmap: the bars are vertical, and accounted for', () => {
  // 1000×500 box, 1.6 bitmap → fit scale 1, so 100px of bar on each side.
  const r = rect(0, 0, 1000, 500);
  near(at(r, 100, 0).x, 0, 'the drawing starts after the left bar');
  near(at(r, 900, 500).x, 800, 'and ends before the right one');
  near(at(r, 500, 250).x, 400, 'the centre is still the centre');
  near(at(r, 500, 250).y, 250, 'the centre is still the centre');
  // The regression itself: the naive box mapping put this point at 400, not 500.
  near(at(r, 725, 250).x, 625, 'a point right of centre');
  assert.ok(at(r, 50, 250).x < 0, 'a click on the bar is outside the bitmap, and says so');
});

test('a box taller than the bitmap: the bars are horizontal', () => {
  // 800×700 box, 800×500 bitmap → scale 1, 100px of bar top and bottom.
  const r = rect(0, 0, 800, 700);
  near(at(r, 0, 100).y, 0, 'the drawing starts below the top bar');
  near(at(r, 800, 600).y, 500, 'and ends above the bottom one');
  near(at(r, 400, 350).y, 250, 'the centre is still the centre');
  assert.ok(at(r, 400, 50).y < 0, 'a click on the bar is outside the bitmap');
});

test('the mapping stays square — a circle drawn on a wide box is not an ellipse', () => {
  const r = rect(0, 0, 1000, 400);
  const a = at(r, 300, 200);
  const b = at(r, 400, 300);   // 100px right and 100px down, on screen
  near(b.x - a.x, b.y - a.y, 'equal screen distances must give equal bitmap distances');
});

// The fix only holds while the CSS still letterboxes. If someone drops object-fit,
// the maths above starts subtracting bars that are no longer there.
test('the CSS and the pointer mapping agree about object-fit', () => {
  const rules = [...css.matchAll(/#scb-canvas\s*\{([^}]*)\}/g)].map(m => m[1]);
  assert.ok(rules.length > 0, '#scb-canvas has no rule in public/style.css');
  const fits = rules.filter(r => /object-fit\s*:/.test(r)).map(r => r.match(/object-fit\s*:\s*([\w-]+)/)[1]);
  assert.ok(fits.length > 0 && fits.every(f => f === 'contain'),
    'pointerToBitmap() undoes an object-fit: contain — change the CSS and you must change it too');
});
