// Every environment variable the server reads, in one place.
//
// Nothing else in the project touches `process.env`: there is one list of knobs,
// one place that validates them, and one place to look when a value misbehaves.
// A `.env` file next to this one is loaded first and never overrides a variable
// that is already set, so `PORT=5000 npm start` and docker's `environment:` still
// win over the file — which is what people expect.
//
// The parser is twenty lines rather than `dotenv` for the same reason there is no
// database and no bundler: one less dependency to audit, and it works on Node 18,
// which has no `--env-file`.

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '.env');

/** `.env` text → plain object. Full-line `#` comments, optional quotes, `export` tolerated. */
function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\n/g, '\n');
    }
    out[key] = value;
  }
  return out;
}

/** Loads `.env` into `env` without clobbering what is already there. */
function loadEnvFile(env = process.env, file = ENV_PATH) {
  if (!fs.existsSync(file)) return {};
  const parsed = parseEnvFile(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] === undefined) env[key] = value;
  }
  return parsed;
}

// ─── Readers. Each rejects a bad value instead of quietly falling back, so a
// typo in `.env` is a startup error and not a mystery three games later. ───

function invalid(key, value, expected) {
  throw new Error(`${key}="${value}" is not valid — expected ${expected}. See .env.example.`);
}

function readPort(env, key, fallback) {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) invalid(key, raw, 'a port between 1 and 65535');
  return n;
}

function readBool(env, key, fallback) {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const v = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return invalid(key, raw, 'true or false');
}

function readText(env, key, fallback) {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.trim();
}

function readChoice(env, key, fallback, choices) {
  const raw = readText(env, key, fallback).toLowerCase();
  if (!choices.includes(raw)) invalid(key, raw, choices.map(c => `"${c}"`).join(', '));
  return raw;
}

function readUrl(env, key, fallback) {
  const raw = readText(env, key, fallback);
  if (!/^https?:\/\//.test(raw)) invalid(key, raw, 'an http:// or https:// URL');
  return raw;
}

/** env → validated config. Throws an `Error` whose message names the culprit. */
function buildConfig(env = process.env) {
  return {
    port:        readPort(env, 'PORT', 4000),
    host:        readText(env, 'HOST', '0.0.0.0'),
    mdnsEnabled: readBool(env, 'MDNS_ENABLED', true),
    mdnsHost:    readText(env, 'MDNS_HOST', 'gamenight.local'),
    // auto  → try the internet, fall back to the bundled bank
    // online → the internet only; a failure sends the room back to the lobby
    // offline → never leave the LAN
    quizSource:  readChoice(env, 'QUIZ_SOURCE', 'auto', ['auto', 'online', 'offline']),
    quizApiUrl:  readUrl(env, 'QUIZ_API_URL', 'https://opentdb.com/api.php'),
  };
}

loadEnvFile();

let config;
try {
  config = buildConfig(process.env);
} catch (err) {
  console.error(`\n✗ Bad configuration: ${err.message}\n`);
  process.exit(1);
}

module.exports = { config, parseEnvFile, loadEnvFile, buildConfig };
