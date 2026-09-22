// said-vs-done — layer 9: the two languages must actually be two languages.
//
// WHY THIS EXISTS. Fingerprints do not cover prose. The golden tests compare
// the JSON snapshot, and human-readable text is not in it. The known-answer
// suite reads verdicts, not sentences. So every message in this tool could be
// half-translated, or translated into a mixture of both languages, and every
// other layer would stay green — while a Polish reader saw English fragments
// and an English reader saw Polish ones.
//
// It reads the dictionary itself rather than matching the file with a regular
// expression, so what is checked is exactly what ships.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { messages } from '../src/lang.mjs';
import { LANGUAGES, LANGUAGE_NAMES } from '../src/promise.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Words that are allowed to appear in a Polish message because they are
// identifiers, not prose: flag names, verdict names, file extensions. This list
// is the tool's own vocabulary, and it has to be explicit — otherwise the check
// either fails on `--code` or passes on anything.
const TECHNICAL = new Set([
  'said', 'vs', 'done', 'say', 'json', 'code', 'lang', 'config', 'tier', 'area',
  'top', 'only', 'all', 'html', 'js', 'ts', 'md', 'npx', 'no', 'witness',
  'covered', 'elsewhere', 'inspect', 'sure', 'edge', 'scopeUnset', 'EISDIR',
  'hex', 'pl', 'en', 'de', 'es', 'UTF', 'path', 'repo', 'file', 'previous',
  'deletion',
]);

// English function words that have no business inside a Polish sentence.
const ENGLISH_ONLY = /\b(the|and|with|from|that|this|which|were|been|have|has|does|not|for|are|was|will|would|should|could|your|their|there|when|what|where|because|before|after|about|into|than|then|they|them|these|those|here|only|also|every|each|both|such|same|other|another|between|through|during|while|against|without|within|under|over|again|further|once|any|some|more|most|very|just|even|still|already|nothing|something|anything)\b/gi;

let failed = 0;
const fail = (msg) => { failed++; console.log('    FAIL  ' + msg); };

console.log('said-vs-done — the two languages\n');

const keys = Object.keys(messages);

// ---- 1. every key has both languages
console.log('  1. every message exists in both languages');
const missing = keys.filter(k => !messages[k].en || !messages[k].pl);
if (missing.length) fail(missing.length + ' key(s) missing a language: ' + missing.slice(0, 6).join(', '));
else console.log('    ok    ' + keys.length + ' keys, both languages');

// ---- 2. no English prose inside a Polish message
console.log('\n  2. no English inside a Polish message');
for (const k of keys) {
  const pl = messages[k].pl || '';
  const words = (pl.match(ENGLISH_ONLY) || []).filter(w => !TECHNICAL.has(w.toLowerCase()));
  if (words.length) fail(k + ': Polish message contains ' + JSON.stringify([...new Set(words)]) + ' — "' + pl.slice(0, 70) + '"');
}
if (!failed) console.log('    ok    no English prose in any Polish message');

// ---- 3. the two versions must use the same placeholders
//
// A translation that drops {1} prints a message missing the file name, and the
// only symptom is a sentence that reads slightly oddly in one language.
console.log('\n  3. placeholders match between languages');
const holders = s => [...String(s).matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');
for (const k of keys) {
  const a = holders(messages[k].en), b = holders(messages[k].pl);
  if (a !== b) fail(k + ': en uses {' + a + '}, pl uses {' + b + '}');
}

// ---- 4. neither version is a copy of the other
//
// A message left untranslated is the commonest way for this to rot, and it is
// invisible unless somebody reads both columns. Messages that are legitimately
// identical — a bare identifier like `hex` — are short, so the check applies
// only above a length where a coincidence is not credible.
console.log('\n  4. no message left untranslated');
for (const k of keys) {
  const { en, pl } = messages[k];
  if (en.length > 24 && en === pl) fail(k + ': identical in both languages — "' + en.slice(0, 60) + '"');
}

// ---- 5. verdict and area names are NOT translated
//
// They travel in the snapshot JSON. A snapshot whose contents change with
// --lang cannot be diffed against one a colleague wrote in the other language,
// and the diff would report every promise as gone and re-arrived.
console.log('\n  5. identifiers stay identical in both languages');
for (const id of ['no-witness', 'covered', 'elsewhere', 'inspect']) {
  const inEn = keys.filter(k => (messages[k].en || '').includes(id));
  for (const k of inEn) {
    if (!(messages[k].pl || '').includes(id)) fail(k + ': "' + id + '" was translated away in the Polish version');
  }
}

// ---- 6. the package page, which is the only part a stranger reads first
//
// npm prints the description and the keywords to somebody who has never heard
// of this project. Nothing was checking either, and both are the kind of
// sentence that is written once and then quietly stops being true.
//
// A SIBLING TOOL SHIPPED A RELEASE whose whole description was Polish without
// diacritics — `Porownuje migracje SQL ... Tylko odczyt.` — and no test said a
// word, because a check for ąćęłńóśźż would have let that sentence through.
//
// AND THE SUBSTRING TRAP IS WORSE HERE THAN ANYWHERE. This tool reads promise
// text in four languages, and their codes are two letters: `en` sits inside
// "when", `pl` inside "simply", `de` inside "under", `es` inside "promises".
// A check written against the codes would pass on any English sentence at all.
// So the table carries a NAME for each, and the names are matched on word
// boundaries.
console.log('\n  6. the package page');
{
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const names = LANGUAGES.map(c => LANGUAGE_NAMES[c]);

  const unnamed = LANGUAGES.filter(c => !LANGUAGE_NAMES[c]);
  if (unnamed.length) fail('a language with no name to search for: ' + unnamed.join(', '));

  const LETTER = c => c !== undefined && /[A-Za-z]/.test(c);
  const namesIt = (text, name) => {
    for (let at = text.indexOf(name); at !== -1; at = text.indexOf(name, at + 1))
      if (!LETTER(text[at - 1]) && !LETTER(text[at + name.length])) return true;
    return false;
  };

  const absent = names.filter(nm => !namesIt(pkg.description, nm));
  if (absent.length) fail('the description names no ' + absent.join(', ') + ' — nobody searching for it finds this');

  const kw = (pkg.keywords || []).map(k => k.toLowerCase());
  const unkeyed = names.filter(nm => !kw.includes(nm.toLowerCase()));
  if (unkeyed.length) fail('the keywords name no ' + unkeyed.join(', '));

  // The smoke alarm, not a language detector. Function words no Polish
  // sentence of this length avoids, plus the ones that actually shipped.
  const POLISH = ['nie', 'jest', 'sie', 'tego', 'tym', 'tych', 'ktore', 'ktora', 'ktory',
    'oraz', 'przez', 'dla', 'jako', 'tylko', 'bez', 'gdy', 'czy', 'juz', 'moze', 'musi',
    'wszystkie', 'porownuje', 'wypisuje', 'sprawdza', 'zwraca', 'odczyt', 'plik', 'pliku',
    'kod', 'kodu', 'obietnice', 'obietnic', 'narzedzie', 'czyta'];
  const DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
  const words = (pkg.description.match(/[A-Za-z]{3,}/g) || []).map(w => w.toLowerCase());
  const leaked = [...new Set(words.filter(w => POLISH.includes(w)))];
  const diacritic = pkg.description.match(DIACRITICS);
  if (diacritic) fail('the description is not in English: Polish letter ' + diacritic[0]);
  else if (leaked.length) fail('the description is not in English: ' + leaked.join(', '));

  // npm lowercases nothing and de-duplicates nothing: a keyword with a capital
  // in it is a keyword nobody reaches.
  const raw = pkg.keywords || [];
  const cased = raw.filter(k => k !== k.toLowerCase());
  const dupes = [...new Set(kw.filter((k, i) => kw.indexOf(k) !== i))];
  if (!raw.length) fail('no keywords at all');
  if (cased.length) fail('keywords not lowercase: ' + cased.join(', '));
  if (dupes.length) fail('keywords duplicated: ' + dupes.join(', '));
}

console.log('\n  ' + (failed ? failed + ' failed' : 'all checks passed'));
if (failed) process.exit(1);
