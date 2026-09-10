// config.js is the only place that reads the environment, so a bad value has to
// die at startup with a message that names the culprit — not three games later.
//
// It also has to stay honest with .env.example: a variable the code reads and the
// example never mentions is a knob nobody will find, and a variable the example
// promises and the code ignores is a lie.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseEnvFile, loadEnvFile, buildConfig } = require('../config.js');

const ROOT = path.join(__dirname, '..');

test('an empty environment gives the documented defaults', () => {
  const c = buildConfig({});
  assert.equal(c.port, 4000);
  assert.equal(c.host, '0.0.0.0');
  assert.equal(c.mdnsEnabled, true);
  assert.equal(c.mdnsHost, 'gamenight.local');
  assert.equal(c.quizSource, 'auto');
  assert.equal(c.quizApiUrl, 'https://opentdb.com/api.php');
});

test('values are read, not ignored', () => {
  const c = buildConfig({
    PORT: '8080',
    HOST: '127.0.0.1',
    MDNS_ENABLED: 'false',
    MDNS_HOST: 'party.local',
    QUIZ_SOURCE: 'offline',
    QUIZ_API_URL: 'http://mirror.example/api.php',
  });
  assert.equal(c.port, 8080);
  assert.equal(c.host, '127.0.0.1');
  assert.equal(c.mdnsEnabled, false);
  assert.equal(c.mdnsHost, 'party.local');
  assert.equal(c.quizSource, 'offline');
  assert.equal(c.quizApiUrl, 'http://mirror.example/api.php');
});

test('a blank value is the same as an absent one', () => {
  const c = buildConfig({ PORT: '', HOST: '   ', MDNS_ENABLED: '', QUIZ_SOURCE: '' });
  assert.equal(c.port, 4000);
  assert.equal(c.host, '0.0.0.0');
  assert.equal(c.mdnsEnabled, true);
  assert.equal(c.quizSource, 'auto');
});

test('booleans accept the spellings people actually type', () => {
  for (const yes of ['1', 'true', 'TRUE', 'yes', 'on']) {
    assert.equal(buildConfig({ MDNS_ENABLED: yes }).mdnsEnabled, true, `"${yes}" should be true`);
  }
  for (const no of ['0', 'false', 'FALSE', 'no', 'off']) {
    assert.equal(buildConfig({ MDNS_ENABLED: no }).mdnsEnabled, false, `"${no}" should be false`);
  }
});

test('a nonsense value is refused, not silently replaced by the default', () => {
  const bad = [
    { PORT: 'four thousand' },
    { PORT: '0' },
    { PORT: '70000' },
    { PORT: '4000.5' },
    { MDNS_ENABLED: 'maybe' },
    { QUIZ_SOURCE: 'sometimes' },
    { QUIZ_API_URL: 'opentdb.com/api.php' },   // no scheme
    { QUIZ_API_URL: 'ftp://opentdb.com' },
  ];
  for (const env of bad) {
    const key = Object.keys(env)[0];
    assert.throws(() => buildConfig(env), err => {
      assert.match(err.message, new RegExp(key), 'the message must name the variable at fault');
      assert.match(err.message, /\.env\.example/, 'the message must point at .env.example');
      return true;
    }, `${key}="${env[key]}" should have been refused`);
  }
});

test('.env parsing handles comments, quotes and an export prefix', () => {
  const parsed = parseEnvFile([
    '# a comment',
    '',
    'PORT=4500',
    '  HOST = 127.0.0.1  ',
    'export MDNS_HOST=party.local',
    'QUIZ_API_URL="http://mirror.example/api.php"',
    "MDNS_ENABLED='false'",
    'NOT_AN_ASSIGNMENT',
    '9INVALID=x',
  ].join('\n'));

  assert.deepEqual(parsed, {
    PORT: '4500',
    HOST: '127.0.0.1',
    MDNS_HOST: 'party.local',
    QUIZ_API_URL: 'http://mirror.example/api.php',
    MDNS_ENABLED: 'false',
  });
});

test('the real environment wins over the .env file', () => {
  const file = path.join(__dirname, 'fixture.env');
  fs.writeFileSync(file, 'PORT=4500\nMDNS_HOST=fromfile.local\n');
  try {
    const env = { PORT: '9999' };
    loadEnvFile(env, file);
    assert.equal(env.PORT, '9999', 'an already-set variable must not be overwritten');
    assert.equal(env.MDNS_HOST, 'fromfile.local', 'an unset one comes from the file');
  } finally {
    fs.unlinkSync(file);
  }
});

test('a missing .env is not an error', () => {
  const env = {};
  assert.deepEqual(loadEnvFile(env, path.join(__dirname, 'does-not-exist.env')), {});
  assert.deepEqual(env, {});
});

// The example file is the documentation. If it drifts, someone sets a variable
// that does nothing, or never learns about one that does.
test('.env.example documents every variable config.js reads', () => {
  const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  const source = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');

  const read = [...source.matchAll(/read(?:Port|Bool|Text|Choice|Url)\(env, '([A-Z0-9_]+)'/g)].map(m => m[1]);
  assert.ok(read.length >= 6, 'the reader regex found nothing — has config.js been restructured?');

  const documented = new Set([...example.matchAll(/^([A-Z0-9_]+)=/gm)].map(m => m[1]));
  for (const key of read) {
    assert.ok(documented.has(key), `${key} is read by config.js but absent from .env.example`);
  }
  for (const key of documented) {
    assert.ok(read.includes(key), `.env.example promises ${key}, which config.js never reads`);
  }
});

// .env holds whatever an instance owner put in it. It must never be committed.
test('.env stays gitignored', () => {
  const ignored = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map(l => l.trim());
  assert.ok(ignored.includes('.env'), '.env must stay in .gitignore');
  assert.ok(!ignored.includes('.env.example'), '.env.example is the committed documentation');
});
