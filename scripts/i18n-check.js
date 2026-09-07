#!/usr/bin/env node
// Compares the language files against each other and against the keys actually
// used in public/. Exits non-zero on a real problem so CI can gate on it.
//
//   node scripts/i18n-check.js
//
// Dynamic keys (built with a template literal, e.g. `kd.role.${role}`) cannot be
// resolved statically — they are listed as "unchecked", never as errors.

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const I18N_DIR = path.join(PUBLIC_DIR, 'js', 'i18n');
const REFERENCE = 'en';
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

function readDict(code) {
  return JSON.parse(fs.readFileSync(path.join(I18N_DIR, `${code}.json`), 'utf8'));
}

function baseKey(key) {
  const suffix = PLURAL_SUFFIXES.find(s => key.endsWith(s));
  return suffix ? key.slice(0, -suffix.length) : key;
}

// ─── Collect the keys the app actually asks for ───
function usedKeys() {
  const used = new Set();      // asked for explicitly — must exist
  const mentioned = new Set(); // any key-shaped literal, used to spot dead keys
  const dynamic = new Set();

  const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-html|-placeholder|-title|-aria-label)?="([^"]+)"/g)) used.add(m[1]);

  for (const file of fs.readdirSync(path.join(PUBLIC_DIR, 'js')).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(PUBLIC_DIR, 'js', file), 'utf8');
    // t('key') / t('key', params) — a trailing `,` or `)` rules out `t('a.' + x)`.
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'\s*[,)]/g)) used.add(m[1]);
    for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) dynamic.add(m[1]);
    // Keys handed around as data: ternaries, tables, addHistory('key', …).
    for (const m of src.matchAll(/'([a-z][\w]*(?:\.[\w]+)+)'/gi)) mentioned.add(m[1]);
  }
  return { used, mentioned, dynamic };
}

// ─── Run ───
const languages = fs.readdirSync(I18N_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const dicts = Object.fromEntries(languages.map(code => [code, readDict(code)]));
const reference = dicts[REFERENCE];
if (!reference) {
  console.error(`i18n: no ${REFERENCE}.json — the fallback language is required.`);
  process.exit(1);
}

let failed = false;
const refKeys = new Set(Object.keys(reference));

for (const code of languages.filter(c => c !== REFERENCE)) {
  const keys = new Set(Object.keys(dicts[code]));
  const missing = [...refKeys].filter(k => !keys.has(k));
  const extra = [...keys].filter(k => !refKeys.has(k));
  if (missing.length) {
    failed = true;
    console.error(`\n✗ ${code}: ${missing.length} key(s) missing (falls back to ${REFERENCE}):`);
    missing.forEach(k => console.error(`    ${k}`));
  }
  if (extra.length) {
    console.warn(`\n⚠ ${code}: ${extra.length} key(s) not in ${REFERENCE}.json (orphans?):`);
    extra.forEach(k => console.warn(`    ${k}`));
  }
  if (!missing.length && !extra.length) console.log(`✓ ${code}: in sync with ${REFERENCE}.json (${keys.size} keys)`);
}

const { used, mentioned, dynamic } = usedKeys();
const known = new Set([...refKeys].map(baseKey));
const undefinedKeys = [...used].filter(k => !refKeys.has(k) && !known.has(k));
if (undefinedKeys.length) {
  failed = true;
  console.error(`\n✗ ${undefinedKeys.length} key(s) used in public/ but absent from ${REFERENCE}.json:`);
  undefinedKeys.forEach(k => console.error(`    ${k}`));
} else {
  console.log(`✓ every key used in public/ exists in ${REFERENCE}.json (${used.size} checked)`);
}

const seen = key => used.has(key) || mentioned.has(key);
const unused = [...refKeys].filter(k => !seen(k) && !seen(baseKey(k)) && !k.startsWith('avatar.'));
if (unused.length) {
  console.warn(`\n⚠ ${unused.length} key(s) defined but never used (dead weight, or used dynamically):`);
  unused.forEach(k => console.warn(`    ${k}`));
}

if (dynamic.size) {
  console.log(`\nℹ ${dynamic.size} dynamic key pattern(s) not statically checkable:`);
  dynamic.forEach(k => console.log(`    ${k}`));
}

process.exit(failed ? 1 : 0);
