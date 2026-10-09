// Translations. English is the default; Malayalam and Kannada use the same keys.
const dictionaries = {
  en: require('./en'),
  ml: require('./ml'),
  kn: require('./kn'),
};

const LANGS = Object.keys(dictionaries);
const DEFAULT_LANG = 'en';

// Look up a key, falling back to English so a missing translation never shows a raw key.
function t(lang, key) {
  const dict = dictionaries[lang] || dictionaries[DEFAULT_LANG];
  if (key in dict) return dict[key];
  if (key in dictionaries[DEFAULT_LANG]) return dictionaries[DEFAULT_LANG][key];
  return key;
}

// Fill "{name}" style slots in a translated string.
function format(str, vals) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
}

// Keys whose strings the browser needs (pop-ups, form errors, brochure controls…).
function clientStrings(lang, prefixes) {
  const out = {};
  for (const key of Object.keys(dictionaries[DEFAULT_LANG])) {
    if (prefixes.some((p) => key.startsWith(p))) out[key] = t(lang, key);
  }
  return out;
}

module.exports = { dictionaries, LANGS, DEFAULT_LANG, t, format, clientStrings };
