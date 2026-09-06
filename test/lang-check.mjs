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
import { messages } from '../src/lang.mjs';

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

console.log('\n  ' + (failed ? failed + ' failed' : 'all checks passed'));
if (failed) process.exit(1);
