// said-vs-done — layer 5: four languages must actually be four languages.
//
// WHY. The dictionary is nine areas times four languages, and a gap in one cell
// is invisible in every total: the other three languages carry the count while
// one of them silently finds nothing. That is not hypothetical. German first
// person singular was missing entirely — every `ich` form, in every area — and
// the totals looked healthy because the German infinitives were still matching
// on sentences that happened to have a second verb. Nothing but a check of the
// table itself would have found it.
//
// FOUR CHECKS, each for a gap the others cannot see.
import { AREAS, LANGUAGES, SURE_FORMS, _tables, recognise } from '../src/promise.mjs';

let failed = 0;
const fail = (msg) => { failed++; console.log('    FAIL  ' + msg); };
console.log('said-vs-done — the lexicon\n');

// ---- 1. every area exists in every language
console.log('  1. every area present in every language');
const TABLE = { pl: _tables.PL, en: _tables.EN, de: _tables.DE, es: _tables.ES };
for (const lang of LANGUAGES) {
  const missing = AREAS.filter(a => {
    const cell = TABLE[lang][a];
    if (!cell) return true;
    return Array.isArray(cell) ? cell.length === 0 : Object.values(cell).every(v => v.length === 0);
  });
  if (missing.length) fail(lang + ' has no verbs for: ' + missing.join(', '));
  else console.log('    ok    ' + lang + ' covers all ' + AREAS.length + ' areas');
}

// ---- 2. Polish carries every person, because Polish has no subject token
console.log('\n  2. Polish has every form in every area');
for (const area of AREAS) {
  const cell = _tables.PL[area];
  const empty = SURE_FORMS.filter(f => !cell[f] || cell[f].length === 0);
  if (empty.length) fail('pl/' + area + ' is missing: ' + empty.join(', '));
}
if (!failed) console.log('    ok    all ' + AREAS.length + ' areas carry all ' + SURE_FORMS.length + ' forms');

// ---- 3. no word appears in two areas of the same language
//
// A verb in two areas produces two promises from one clause, and the overlap
// filter cannot collapse them because it never merges across areas — by design,
// since "wird verschlüsselt gespeichert" really is two promises. So the tables
// have to be disjoint, and only a check can keep them that way.
console.log('\n  3. no verb claimed by two areas');
for (const lang of LANGUAGES) {
  const seen = new Map();
  for (const area of AREAS) {
    const cell = TABLE[lang][area];
    if (!cell) continue;
    const words = Array.isArray(cell) ? cell : Object.values(cell).flat();
    for (const w of words) {
      if (w.startsWith('~')) continue;          // raw regexes are allowed to overlap
      if (seen.has(w) && seen.get(w) !== area) fail(lang + ': "' + w + '" is in both ' + seen.get(w) + ' and ' + area);
      seen.set(w, area);
    }
  }
}

// ---- 4. the languages do not leak into each other
//
// Every language is checked against a sentence written in ANOTHER language that
// contains none of its vocabulary. A leak here means one table has picked up a
// word that belongs to a neighbour, and the symptom in the field is a promise
// attributed to the wrong language and therefore judged with the wrong rules.
console.log('\n  4. no cross-language leakage');
const FOREIGN = {
  pl: 'We delete all your data and we never share it with anyone.',
  en: 'Usuwamy wszystkie Twoje dane i nigdy ich nikomu nie udostępniamy.',
  de: 'Eliminamos todos tus datos y nunca los compartimos con nadie.',
  es: 'Ihre Daten löschen wir und geben sie niemals weiter.',
};
for (const [lang, sentence] of Object.entries(FOREIGN)) {
  const hits = recognise(sentence, lang).filter(h => h.tier === 'sure');
  if (hits.length) fail(lang + ' matched a foreign sentence on "' + hits[0].match + '"');
  else console.log('    ok    ' + lang + ' finds nothing in a foreign sentence');
}

console.log('\n  ' + (failed ? failed + ' failed' : 'all checks passed'));
if (failed) process.exit(1);
