// said-vs-done — layer 6: sentences that must NOT be promises.
//
// WHY A SUITE OF ITS OWN. Every other layer measures what the tool finds. A
// dictionary can always find more by matching more, and each of the widenings
// below looked reasonable when it was written. All of them shipped, and all of
// them were caught by reading output rather than by a test — which is not a
// method, it is luck.
//
// Every case here is a real false positive this tool produced, kept as a
// permanent negative. The comment on each is what it cost.
//
// THE SUITE ALSO ASSERTS THE POSITIVES. A dictionary that matches nothing at
// all passes every negative test ever written. So each group carries a control
// sentence that MUST still be recognised; a run where the negatives pass and
// the controls fail is a broken dictionary, not a careful one.
import { recognise } from '../src/promise.mjs';

const MUST_NOT = [
  ['pl', 'Systemy i programy to nie problemy.',
    'plural nouns ending in -my; the reason Polish gets an explicit wordlist and not a "-my is first person plural" rule'],
  ['pl', 'To nie jest obietnica, że dane są bezpieczne w mojej chmurze.',
    'metatext: the sentence declines to promise, and was counted as promising'],
  ['pl', 'Plik, który nigdzie nie pojechał, nie potrzebuje żadnej obietnicy.',
    'metatext again, on a page whose whole argument is "do not trust me, check"'],
  ['en', 'I have to send a session recording to a server I know nothing about.',
    'modal: obligation describing a predicament, on a page arguing the author refuses to do it'],
  ['en', 'I read that Upheal stores recordings for 30 days.',
    'the subject after "that" is a competitor, not the author'],
  ['en', 'We are not quoting a figure: NCH does not publish one on the product page.',
    'the subject window reached across a colon into somebody else\'s clause'],
  ['es', 'Todavía no se ha enviado ninguna incidencia desde esta cuenta.',
    'impersonal passive; a Spanish participle is first person only after "hemos"'],
  ['es', 'Basta con «no se abre un proyecto guardado».',
    '"guardado" here is an adjective qualifying a noun, not a verb with a speaker'],
  ['en', 'There is no guarantee that this will work.',
    'the bare noun "guarantee" is the thing being denied'],
  ['de', 'Das funktioniert garantiert nicht.',
    '"garantiert" as an adverb means "certainly", and promises nothing'],
];

// The controls. Each is the nearest sentence that IS a promise, so a dictionary
// that passes the negatives by matching nothing fails here instead.
const MUST = [
  ['pl', 'Usuwamy wszystkie Twoje dane.', 'deletion'],
  ['pl', 'Nie udostępniamy Twoich danych nikomu.', 'sharing'],
  ['pl', 'Zgłoszenia kasuję po 90 dniach.', 'deletion'],
  ['en', 'We delete all your data within 24 hours.', 'deletion'],
  ['en', 'I reply to the address of your account.', 'response'],
  ['de', 'Ich lösche diese Einträge nach 90 Tagen.', 'deletion'],
  ['de', 'Ihre Daten geben wir nicht weiter.', 'sharing'],
  ['es', 'Eliminamos todos tus datos en 24 horas.', 'deletion'],
  ['es', 'No compartimos tu información.', 'sharing'],
];

console.log('said-vs-done — negatives: what must not be read as a promise\n');

let failed = 0;

console.log('  must NOT be a promise');
for (const [lang, sentence, why] of MUST_NOT) {
  // The `sure` tier only. An edge reading of these is defensible — a passive
  // sentence about deletion is genuinely near a promise — but a `sure` reading
  // claims the sentence names an author who is bound by it, and none of these
  // do.
  const hits = recognise(sentence, lang).filter(h => h.tier === 'sure');
  if (hits.length) {
    failed++;
    console.log('    FAIL  [' + lang + '] ' + sentence.slice(0, 62));
    console.log('          read as ' + hits.map(h => h.area + '/' + h.form).join(', ') +
      ' on "' + hits[0].match + '"');
    console.log('          ' + why);
  } else {
    console.log('    ok    [' + lang + '] ' + sentence.slice(0, 62));
  }
}

console.log('\n  must still BE a promise (the control)');
for (const [lang, sentence, area] of MUST) {
  const hits = recognise(sentence, lang).filter(h => h.tier === 'sure' && h.area === area);
  if (!hits.length) {
    failed++;
    console.log('    FAIL  [' + lang + '] ' + sentence.slice(0, 62));
    console.log('          expected a sure ' + area + ' promise, got ' +
      JSON.stringify(recognise(sentence, lang).map(h => h.tier + '/' + h.area)));
  } else {
    console.log('    ok    [' + lang + '] ' + sentence.slice(0, 62));
  }
}

console.log('\n  ' + (MUST_NOT.length + MUST.length - failed) + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('\n  A widening that gains a promise by also gaining one of these is not a gain.');
  process.exit(1);
}
