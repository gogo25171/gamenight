// ═══════════════════ I18N ═══════════════════
// Per-player interface language. Nothing here is shared with the room: the
// choice lives in localStorage and only re-renders this browser.
const I18n = (() => {
  const LANGUAGES = [
    // `name` is written in the language itself on purpose — someone stuck in a
    // language they cannot read still has to find their own.
    { code: 'en', name: 'English',  flag: '🇬🇧', dir: 'ltr' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  ];
  const FALLBACK = 'en';
  const STORAGE_KEY = 'gn_lang';

  let current = FALLBACK;
  let dict = {};
  let fallbackDict = {};
  const listeners = [];
  const warned = new Set();

  // ─── Loading ───
  function detect() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some(l => l.code === saved)) return saved;
    const tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const tag of tags) {
      const base = String(tag).toLowerCase().split('-')[0];
      const hit = LANGUAGES.find(l => l.code === base);
      if (hit) return hit.code;
    }
    return FALLBACK;
  }

  async function fetchDict(code) {
    const res = await fetch(`js/i18n/${code}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`i18n: cannot load ${code}.json (${res.status})`);
    return res.json();
  }

  async function init() {
    try {
      fallbackDict = await fetchDict(FALLBACK);
    } catch (err) {
      // The HTML already carries English text, so a failed load degrades to
      // "untranslated" rather than to a blank page.
      console.error(err);
    }
    dict = fallbackDict;
    await setLanguage(detect(), { silent: true });
    initSwitcher();
  }

  async function setLanguage(code, { silent = false } = {}) {
    const lang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
    if (lang.code === FALLBACK) {
      dict = fallbackDict;
    } else {
      try {
        dict = await fetchDict(lang.code);
      } catch (err) {
        console.error(err);
        dict = fallbackDict;
      }
    }
    current = lang.code;
    localStorage.setItem(STORAGE_KEY, current);
    document.documentElement.lang = current;
    document.documentElement.dir = lang.dir;
    warned.clear();
    apply();
    renderSwitcher();
    // Re-render whatever is on screen: a language change must never reload the
    // page, or the socket — and the game in progress — dies with it.
    if (!silent) listeners.forEach(fn => { try { fn(current); } catch (e) { console.error(e); } });
  }

  // ─── Lookup ───
  function resolve(key, params) {
    const keys = [];
    if (params && typeof params.count === 'number') {
      let category = 'other';
      try { category = new Intl.PluralRules(current).select(params.count); } catch { /* older browser */ }
      keys.push(`${key}_${category}`, `${key}_other`);
    }
    keys.push(key);
    for (const k of keys) if (dict[k] !== undefined) return dict[k];
    for (const k of keys) {
      if (fallbackDict[k] !== undefined) {
        if (!warned.has(key)) { warned.add(key); console.warn(`[i18n] ${current}: missing key "${key}" — falling back to ${FALLBACK}`); }
        return fallbackDict[k];
      }
    }
    return null;
  }

  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (match, name) => {
      const value = params[name];
      if (value === undefined) return match;
      // Numbers go through Intl so decimal separators and grouping follow the
      // language, not the source string.
      if (typeof value === 'number') {
        try { return new Intl.NumberFormat(current).format(value); } catch { return String(value); }
      }
      return String(value);
    });
  }

  function t(key, params) {
    const raw = resolve(key, params);
    if (raw === null) {
      if (!warned.has(key)) { warned.add(key); console.warn(`[i18n] unknown key "${key}"`); }
      return key;
    }
    return interpolate(raw, params);
  }

  // Server payloads arrive as { key, params }; older/plain strings pass through
  // untouched so nothing breaks if a message is not keyed yet.
  function msg(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.key) return t(value.key, value.params);
    return String(value);
  }

  // ─── DOM ───
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
    document.title = t('app.title');
  }

  function onChange(fn) { listeners.push(fn); }

  // ─── Language switcher (fixed top-right on every screen) ───
  function initSwitcher() {
    const btn = document.getElementById('btn-lang');
    const menu = document.getElementById('lang-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('click', e => {
      if (!menu.classList.contains('hidden') && !menu.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    renderSwitcher();
  }

  function closeMenu() {
    const menu = document.getElementById('lang-menu');
    const btn = document.getElementById('btn-lang');
    menu?.classList.add('hidden');
    btn?.setAttribute('aria-expanded', 'false');
  }

  function renderSwitcher() {
    const menu = document.getElementById('lang-menu');
    if (!menu) return;
    menu.innerHTML = '';
    LANGUAGES.forEach(lang => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lang-option' + (lang.code === current ? ' selected' : '');
      item.setAttribute('role', 'menuitem');
      item.setAttribute('lang', lang.code);
      item.innerHTML = `<span class="lang-flag">${lang.flag}</span><span class="lang-name">${lang.name}</span>`;
      item.addEventListener('click', () => { closeMenu(); if (lang.code !== current) setLanguage(lang.code); });
      menu.appendChild(item);
    });
  }

  return { init, setLanguage, t, msg, apply, onChange, languages: () => LANGUAGES.slice(), current: () => current };
})();

// Shorthands used across the game modules.
function t(key, params) { return I18n.t(key, params); }
function tmsg(value) { return I18n.msg(value); }
