// said-vs-done — the promise dictionary, and what counts as recognising one.
//
// A PROMISE IS A SENTENCE THAT COMMITS SOMEONE TO AN ACT. "usuwamy wszystkie
// Twoje dane", "odpowiadamy w ciagu doby", "nie udostepniamy nikomu". Stage one
// of this tool does nothing with them but find them and say where they are; the
// question it has to answer first is whether they can be found MECHANICALLY at
// all.
//
// WHAT THIS FILE IS NOT. It is not a sentiment classifier and not a grammar. It
// is a lexicon of commitment verbs in four languages, plus the grammatical
// marks that say WHO is committing. Everything it knows is in the tables below,
// and that is on purpose: a reader has to be able to see why a sentence was
// caught, and to add the verb their own project uses.
//
// NO IMPORTS. Nothing here reads process.argv, prints, or touches the disk, so
// it can be exercised on a single sentence from `node -e` without the rest of
// the tool existing. (It also cannot import lang.mjs even if it wanted to —
// there is no lang.mjs yet.)
//
// ------------------------------------------------------------------ two tiers
//
//   sure  — the sentence names its author with a grammatical person. "usuwamy",
//           "we delete", "wir loeschen", "eliminamos". Somebody is on the hook,
//           and the sentence says who.
//   edge  — the same commitment with the author removed: a passive ("dane sa
//           szyfrowane"), the product as subject ("nagranie nie opuszcza
//           Twojego komputera"), or a bare noun phrase ("gotowa poprawka",
//           "odpowiedz w ciagu doby").
//
// The split is not decoration. It is the measurement this stage exists to
// produce: if `edge` dwarfs `sure`, the dictionary is guessing, and the honest
// answer is that promises on this site are not written in the first person and
// the tool needs a different handle. All three real defects that motivated the
// tool are visible in both tiers — "usunelismy wszystkie Twoje sny" is `sure`,
// "gotowa poprawka do wklejenia" is `edge` — so neither tier can be dropped.
//
// -------------------------------------------------- why Polish gets a wordlist
//
// In English, German and Spanish the speaker is a separate token — `we`, `wir`,
// `nosotros` — so a rule can anchor on the subject and stay open to any verb.
// Polish carries the person IN THE ENDING, and there is nothing to anchor on.
//
// The obvious shortcut, "a word ending in -my is first person plural", does not
// survive contact with the language: `systemy`, `programy`, `problemy`, `domy`,
// `rytmy`, `tlumy` are all plural NOUNS with that ending, and three of them
// appear on the very page this tool was pointed at first. So Polish is an
// explicit list of inflected forms. It is longer and it is honest: what is not
// in the list is not found, and that shows up as a low `sure` count rather than
// as noise.

// ---------------------------------------------------------------- areas
//
// The area is what the promise is ABOUT, and it is the same nine everywhere.
// Stage two will need it to know where in the code to look: a `deletion`
// promise sends you to whatever performs the delete, a `response` promise to
// the mail sender. The three defects this tool was built from land in
// `deletion`, `response` and `access` respectively.
export const AREAS = [
  'deletion',      // we delete / erase / wipe
  'transmission',  // we send / it never leaves the machine
  'storage',       // we store / keep / retain
  'encryption',    // we encrypt / hash
  'sharing',       // we pass on / sell / disclose  (usually negated)
  'response',      // we reply / get back to you
  'payment',       // we refund / we charge
  'access',        // we unlock / enable / grant
  'guarantee',     // we guarantee / ensure / commit
];

export const LANGUAGES = ['pl', 'en', 'de', 'es'];

// The forms that put somebody on the hook. `we-*` and `i-*` are both `sure`:
// a one-person business writing "odpowiadam w ciagu doby" has promised exactly
// as much as a company writing "odpowiadamy".
export const SURE_FORMS = ['we-now', 'we-will', 'we-did', 'i-now', 'i-will', 'i-did'];
export const EDGE_FORMS = ['passive', 'subject', 'nominal'];

// ------------------------------------------------------------- word boundaries
//
// `\b` IS UNUSABLE FOR THESE LANGUAGES. JavaScript defines it against `\w`,
// which is [A-Za-z0-9_] and nothing else — so `ę`, `ł`, `ś`, `ä`, `ñ` count as
// NON-word characters. `/\bkasuję\b/` therefore never matches "kasuję ", because
// the final `ę` and the following space are both non-word and there is no
// boundary between them. Every Polish verb ending in a diacritic — which is
// most of the first person singular — would silently never be found, and the
// only visible symptom would be a lower count.
//
// So the boundary is stated explicitly, over the letters these four languages
// actually use. Lookbehind needs Node 18, which package.json already requires.
const LETTER = 'A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźżÄÖÜäöüßÁÉÍÓÚÜÑáéíóúüñÀÂÇÈÉÊËÎÏÔÛÙàâçèéêëîïôûù';
const bounded = (body) => new RegExp('(?<![' + LETTER + '])(?:' + body + ')(?![' + LETTER + '])', 'giu');

/**
 * Alternation out of literal words, longest first so `usunę` cannot eat
 * `usunęliśmy`.
 *
 * AN ENTRY STARTING WITH `~` IS RAW REGEX, and German is why. It splits its
 * verbs: `weitergeben` becomes "geben ... weiter" with the object in between,
 * and "Ihre Daten geben wir nicht weiter" is the ordinary way to write the most
 * important promise a privacy policy makes. Listing `geben` as a plain word
 * instead put that sentence in `access` — a promise to GIVE something —
 * which is the opposite of what it says. Listing bare `geben` at all was the
 * mistake: on its own it is "give", and it belongs to no area in particular.
 */
const anyOf = (words) =>
  [...words]
    .sort((a, b) => b.length - a.length)
    .map(w => (w.startsWith('~') ? w.slice(1) : w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('|');

// ============================================================ POLISH
//
// Grouped by area, then by form. Perfective and imperfective both appear:
// "usuwamy" (we are deleting, as a policy) and "usuniemy" (we will delete, on
// an occasion) are equally binding, and the mail in the first real case used
// the third one — "usunęliśmy", past perfective, the tense in which a promise
// has already been claimed as kept.
const PL = {
  deletion: {
    'we-now':  ['usuwamy', 'kasujemy', 'wymazujemy', 'czyścimy', 'likwidujemy', 'niszczymy'],
    'we-will': ['usuniemy', 'skasujemy', 'wymażemy', 'zlikwidujemy', 'zniszczymy'],
    'we-did':  ['usunęliśmy', 'usunęłyśmy', 'skasowaliśmy', 'skasowałyśmy', 'wymazaliśmy', 'zniszczyliśmy'],
    'i-now':   ['usuwam', 'kasuję', 'wymazuję', 'czyszczę', 'niszczę'],
    'i-will':  ['usunę', 'skasuję', 'wymażę', 'zniszczę'],
    'i-did':   ['usunąłem', 'usunęłam', 'skasowałem', 'skasowałam', 'wymazałem', 'wymazałam'],
  },
  transmission: {
    'we-now':  ['wysyłamy', 'przesyłamy', 'nadajemy', 'ślemy'],
    'we-will': ['wyślemy', 'prześlemy'],
    'we-did':  ['wysłaliśmy', 'przesłaliśmy', 'wysłałyśmy'],
    'i-now':   ['wysyłam', 'przesyłam'],
    'i-will':  ['wyślę', 'prześlę'],
    'i-did':   ['wysłałem', 'wysłałam', 'przesłałem', 'przesłałam'],
  },
  storage: {
    'we-now':  ['przechowujemy', 'trzymamy', 'zapisujemy', 'gromadzimy', 'zbieramy', 'rejestrujemy', 'archiwizujemy'],
    'we-will': ['przechowamy', 'zapiszemy', 'zbierzemy', 'zarejestrujemy'],
    'we-did':  ['przechowywaliśmy', 'zapisaliśmy', 'zebraliśmy', 'zarejestrowaliśmy'],
    'i-now':   ['przechowuję', 'trzymam', 'zapisuję', 'gromadzę', 'zbieram', 'rejestruję'],
    'i-will':  ['zapiszę', 'zbiorę', 'zarejestruję'],
    'i-did':   ['zapisałem', 'zapisałam', 'zebrałem', 'zebrałam'],
  },
  encryption: {
    'we-now':  ['szyfrujemy', 'hashujemy', 'zabezpieczamy', 'anonimizujemy'],
    'we-will': ['zaszyfrujemy', 'zabezpieczymy', 'zanonimizujemy'],
    'we-did':  ['zaszyfrowaliśmy', 'zabezpieczyliśmy'],
    'i-now':   ['szyfruję', 'zabezpieczam', 'anonimizuję'],
    'i-will':  ['zaszyfruję', 'zabezpieczę'],
    'i-did':   ['zaszyfrowałem', 'zabezpieczyłem'],
  },
  sharing: {
    'we-now':  ['udostępniamy', 'przekazujemy', 'sprzedajemy', 'ujawniamy', 'odsprzedajemy', 'publikujemy'],
    'we-will': ['udostępnimy', 'przekażemy', 'sprzedamy', 'ujawnimy', 'opublikujemy'],
    'we-did':  ['udostępniliśmy', 'przekazaliśmy', 'sprzedaliśmy', 'ujawniliśmy'],
    'i-now':   ['udostępniam', 'przekazuję', 'sprzedaję', 'ujawniam'],
    'i-will':  ['udostępnię', 'przekażę', 'sprzedam', 'ujawnię'],
    'i-did':   ['udostępniłem', 'przekazałem', 'sprzedałem', 'ujawniłem'],
  },
  response: {
    'we-now':  ['odpowiadamy', 'reagujemy', 'pomagamy', 'kontaktujemy'],
    'we-will': ['odpowiemy', 'zareagujemy', 'pomożemy', 'skontaktujemy', 'odezwiemy'],
    'we-did':  ['odpowiedzieliśmy', 'zareagowaliśmy', 'pomogliśmy'],
    'i-now':   ['odpowiadam', 'reaguję', 'pomagam', 'kontaktuję'],
    'i-will':  ['odpowiem', 'zareaguję', 'pomogę', 'skontaktuję', 'odezwę'],
    'i-did':   ['odpowiedziałem', 'odpowiedziałam', 'pomogłem', 'pomogłam'],
  },
  payment: {
    'we-now':  ['zwracamy', 'oddajemy', 'pobieramy', 'naliczamy', 'obciążamy', 'fakturujemy'],
    'we-will': ['zwrócimy', 'oddamy', 'pobierzemy', 'naliczymy', 'obciążymy'],
    'we-did':  ['zwróciliśmy', 'pobraliśmy', 'naliczyliśmy'],
    'i-now':   ['zwracam', 'oddaję', 'pobieram', 'naliczam', 'obciążam'],
    'i-will':  ['zwrócę', 'oddam', 'pobiorę', 'naliczę'],
    'i-did':   ['zwróciłem', 'zwróciłam', 'pobrałem', 'pobrałam'],
  },
  access: {
    'we-now':  ['odblokowujemy', 'włączamy', 'przyznajemy', 'dajemy', 'oferujemy', 'uruchamiamy'],
    'we-will': ['odblokujemy', 'włączymy', 'przyznamy', 'damy', 'uruchomimy'],
    'we-did':  ['odblokowaliśmy', 'włączyliśmy', 'przyznaliśmy', 'uruchomiliśmy'],
    'i-now':   ['odblokowuję', 'włączam', 'przyznaję', 'daję', 'oferuję', 'uruchamiam'],
    'i-will':  ['odblokuję', 'włączę', 'przyznam', 'dam', 'uruchomię'],
    'i-did':   ['odblokowałem', 'włączyłem', 'przyznałem', 'uruchomiłem'],
  },
  guarantee: {
    'we-now':  ['gwarantujemy', 'zapewniamy', 'obiecujemy', 'dbamy', 'chronimy', 'zobowiązujemy', 'ręczymy', 'odpowiadamy za'],
    'we-will': ['zagwarantujemy', 'zapewnimy', 'zadbamy', 'ochronimy', 'zobowiążemy'],
    'we-did':  ['zagwarantowaliśmy', 'zapewniliśmy', 'zobowiązaliśmy'],
    'i-now':   ['gwarantuję', 'zapewniam', 'obiecuję', 'dbam', 'chronię', 'zobowiązuję', 'ręczę'],
    'i-will':  ['zagwarantuję', 'zapewnię', 'zadbam', 'ochronię'],
    'i-did':   ['zagwarantowałem', 'obiecałem', 'zobowiązałem'],
  },
};

// ============================================================ ENGLISH / GERMAN / SPANISH
//
// These three anchor on the subject instead. The table holds VERB STEMS in the
// forms the language actually writes; the matcher below pairs them with a
// nearby `we` / `wir` / `nosotros`, or — in Spanish, where the pronoun is
// normally dropped — with the first person plural ending carried in the form
// itself.
const EN = {
  deletion:     ['delete', 'deletes', 'deleted', 'remove', 'removes', 'removed', 'erase', 'erased', 'wipe', 'wiped', 'purge', 'purged'],
  transmission: ['send', 'sends', 'sent', 'transmit', 'transmits', 'transmitted', 'upload', 'uploads', 'uploaded', 'email', 'emailed'],
  storage:      ['store', 'stores', 'stored', 'keep', 'keeps', 'kept', 'retain', 'retains', 'retained', 'save', 'saves', 'saved', 'collect', 'collects', 'collected', 'log', 'logs', 'logged'],
  encryption:   ['encrypt', 'encrypts', 'encrypted', 'hash', 'hashes', 'hashed', 'anonymise', 'anonymize', 'anonymised', 'anonymized'],
  sharing:      ['share', 'shares', 'shared', 'sell', 'sells', 'sold', 'disclose', 'discloses', 'disclosed', 'pass on', 'passed on', 'publish', 'published'],
  response:     ['reply', 'replies', 'replied', 'respond', 'responds', 'responded', 'answer', 'answers', 'answered', 'get back', 'got back', 'contact', 'contacted'],
  payment:      ['refund', 'refunds', 'refunded', 'charge', 'charges', 'charged', 'bill', 'billed', 'reimburse', 'reimbursed'],
  access:       ['unlock', 'unlocks', 'unlocked', 'enable', 'enables', 'enabled', 'grant', 'grants', 'granted', 'give', 'gives', 'gave', 'provide', 'provides', 'provided'],
  guarantee:    ['guarantee', 'guarantees', 'guaranteed', 'ensure', 'ensures', 'ensured', 'promise', 'promises', 'promised', 'commit', 'commits', 'committed', 'protect', 'protects', 'protected'],
};

// THE FIRST PERSON SINGULAR WAS MISSING, and it cost a known answer. The table
// began with infinitives, third person and participles — the forms that pair
// with `wir` — and had none of the `ich` forms, which in German are the stem
// plus -e. So "Ich lösche diese Einträge 90 Tage nach dem letzten Auftreten"
// matched nothing at all: the German half of a retention promise the site makes
// in four languages, invisible while the Polish and English halves were found.
//
// It is worth saying how it hid. The sentence "die ich nicht lösche und nicht
// löschen kann" WAS being caught — on the infinitive at the end of the clause,
// not on `lösche` at all — so the language looked covered in the totals. A gap
// that shows up only on the sentences where the second verb is absent is one
// the counts cannot reveal.
const DE = {
  deletion:     ['löschen', 'löscht', 'lösche', 'gelöscht', 'entfernen', 'entfernt', 'entferne', 'vernichten', 'vernichtet', 'vernichte'],
  transmission: ['senden', 'sendet', 'sende', 'gesendet', 'schicken', 'schickt', 'schicke', 'geschickt', 'übertragen', 'überträgt', 'übertrage', 'hochladen', 'hochgeladen', 'lade hoch'],
  storage:      ['speichern', 'speichert', 'speichere', 'gespeichert', 'aufbewahren', 'bewahren', 'bewahrt', 'bewahre', 'aufbewahrt', 'sammeln', 'sammelt', 'sammle', 'gesammelt', 'protokollieren', 'protokolliert', 'protokolliere'],
  encryption:   ['verschlüsseln', 'verschlüsselt', 'verschlüssele', 'verschlüssle', 'anonymisieren', 'anonymisiert', 'anonymisiere', 'hashen', 'gehasht'],
  // The `~` entries are the separable verb with its object in between:
  // "Ihre Daten geben wir nicht weiter", "wir geben nichts weiter".
  sharing:      ['weitergeben', 'weitergibt', 'weitergegeben', '~geb(?:en|e|t)\\s+(?:[^\\s]+\\s+){0,4}?weiter', 'verkaufen', 'verkauft', 'verkaufe', 'offenlegen', 'offengelegt', '~leg(?:en|e|t)\\s+(?:[^\\s]+\\s+){0,4}?offen', 'veröffentlichen', 'veröffentlicht', 'veröffentliche'],
  response:     ['antworten', 'antwortet', 'antworte', 'geantwortet', 'melden', 'meldet', 'melde', 'gemeldet', 'reagieren', 'reagiert', 'reagiere'],
  payment:      ['erstatten', 'erstattet', 'erstatte', 'zurückzahlen', 'zahle zurück', 'berechnen', 'berechnet', 'berechne', 'abrechnen', 'abgerechnet', 'rechne ab'],
  // BARE `geben` IS GONE. On its own it is "give", it belongs to no area,
  // and it stole "geben wir nicht weiter" from `sharing` above.
  access:       ['freischalten', 'freigeschaltet', '~schalt(?:en|e|et)\\s+(?:[^\\s]+\\s+){0,4}?frei', 'aktivieren', 'aktiviert', 'aktiviere', 'gewähren', 'gewährt', 'gewähre'],
  guarantee:    ['garantieren', 'garantiert', 'garantiere', 'zusichern', 'zugesichert', 'sichere zu', 'versprechen', 'verspricht', 'verspreche', 'versprochen', 'schützen', 'schützt', 'schütze', 'geschützt', 'verpflichten', 'verpflichtet', 'verpflichte'],
};

// Spanish keeps the first person plural in the ending, so these ARE the
// first-person-plural forms — present, future and preterite — plus the
// participle used after "hemos".
const ES = {
  deletion:     ['eliminamos', 'eliminaremos', 'borramos', 'borraremos', 'suprimimos', 'destruimos', 'eliminado', 'borrado'],
  transmission: ['enviamos', 'enviaremos', 'mandamos', 'transmitimos', 'subimos', 'enviado', 'mandado'],
  storage:      ['almacenamos', 'almacenaremos', 'guardamos', 'guardaremos', 'conservamos', 'conservaremos', 'recopilamos', 'registramos', 'almacenado', 'guardado', 'conservado'],
  encryption:   ['ciframos', 'ciframos', 'encriptamos', 'anonimizamos', 'cifrado', 'encriptado'],
  sharing:      ['compartimos', 'compartiremos', 'vendemos', 'venderemos', 'cedemos', 'divulgamos', 'publicamos', 'compartido', 'vendido'],
  response:     ['respondemos', 'responderemos', 'contestamos', 'contestaremos', 'atendemos', 'respondido', 'contestado'],
  payment:      ['devolvemos', 'devolveremos', 'reembolsamos', 'cobramos', 'cobraremos', 'facturamos', 'devuelto', 'reembolsado'],
  access:       ['desbloqueamos', 'activamos', 'activaremos', 'concedemos', 'damos', 'ofrecemos', 'proporcionamos', 'activado', 'desbloqueado'],
  guarantee:    ['garantizamos', 'garantizaremos', 'aseguramos', 'prometemos', 'protegemos', 'nos comprometemos', 'garantizado', 'asegurado'],
};

// ---------------------------------------------------------------- edge tier
//
// The same commitment with nobody named. Three shapes, and each of them is a
// real way of writing a promise rather than a failure to write one:
//
//   passive   "dane sa szyfrowane"        — the act is promised, the actor is not
//   subject   "nagranie nie opuszcza..."  — the PRODUCT is the subject
//   nominal   "gotowa poprawka"           — a noun phrase promising a thing
//
// `nominal` is here because of the third real case: help text promising "gotowa
// poprawka do wklejenia" contains no verb at all, and a dictionary of verbs
// would have walked straight past the defect it was built to find.
const EDGE = {
  pl: [
    { area: 'deletion',     form: 'passive', re: bounded('(?:jest|są|zostaje|zostają|zostanie|zostaną|zostały|został[aoy]?|bywa|bywają)\\s+(?:[^\\s]+\\s+){0,2}?(?:usuwan\\w*|usunięt\\w*|skasowan\\w*|wymazan\\w*|niszczon\\w*)') },
    { area: 'deletion',     form: 'passive', re: bounded('usuwane|usunięte|skasowane|wymazane|do usunięcia|bezpowrotnie usuw\\w*') },
    { area: 'transmission', form: 'passive', re: bounded('(?:jest|są|zostaje|zostają|zostanie|zostaną)\\s+(?:[^\\s]+\\s+){0,2}?(?:wysyłan\\w*|wysłan\\w*|przesyłan\\w*|przesłan\\w*|przekazywan\\w*)') },
    { area: 'transmission', form: 'subject', re: bounded('nie\\s+(?:opuszcza|opuszczają|opuści|opuszczą|opuszczało|opuszczały)|nie\\s+(?:trafia|trafiają|trafi|trafią)|nie\\s+(?:wychodzi|wychodzą|wyjdzie)|zostaj[eą]\\s+na\\s+(?:Twoim|twoim|Państwa|dysku|komputerze)|nie\\s+jest\\s+(?:nigdzie\\s+)?wysyłan\\w*|nie\\s+są\\s+(?:nigdzie\\s+)?wysyłane') },
    { area: 'storage',      form: 'passive', re: bounded('(?:jest|są|zostaje|zostają|bywa|bywają)\\s+(?:[^\\s]+\\s+){0,2}?(?:przechowywan\\w*|zapisywan\\w*|zapisan\\w*|gromadzon\\w*|rejestrowan\\w*|archiwizowan\\w*)') },
    { area: 'storage',      form: 'passive', re: bounded('przechowywane|zapisywane|gromadzone|rejestrowane|nie\\s+jest\\s+przechowywan\\w*|nie\\s+są\\s+przechowywane') },
    { area: 'encryption',   form: 'passive', re: bounded('(?:jest|są|zostaje|zostają)\\s+(?:[^\\s]+\\s+){0,2}?(?:szyfrowan\\w*|zaszyfrowan\\w*|zabezpieczon\\w*|hashowan\\w*|anonimizowan\\w*)|szyfrowane|zaszyfrowane|w\\s+postaci\\s+skrótu') },
    { area: 'sharing',      form: 'passive', re: bounded('(?:jest|są|zostaje|zostają)\\s+(?:[^\\s]+\\s+){0,2}?(?:udostępnian\\w*|przekazywan\\w*|sprzedawan\\w*|ujawnian\\w*|publikowan\\w*)|udostępniane|przekazywane\\s+(?:osobom|podmiotom|stronom)|nie\\s+są\\s+udostępniane') },
    { area: 'response',     form: 'nominal', re: bounded('odpowiedź\\s+w\\s+ciągu|odpowiedź\\s+(?:do|w)\\s+\\d+|otrzymasz\\s+odpowiedź|dostaniesz\\s+odpowiedź|odpowiedź\\s+(?:przychodzi|trafia)|czas\\s+odpowiedzi') },
    { area: 'payment',      form: 'nominal', re: bounded('zwrot\\s+(?:w\\s+ciągu|następuje|pieniędzy|kosztów)|prawo\\s+(?:do\\s+)?odstąpienia|gwarancja\\s+zwrotu|bez\\s+(?:dodatkowych\\s+)?opłat') },
    { area: 'access',       form: 'subject', re: bounded('(?:włącza|uruchamia|aktywuje|odblokowuje|odnawia)\\s+się|(?:są|jest|zostaje)\\s+(?:od\\s+razu\\s+)?(?:dostępn\\w*|odblokowan\\w*|aktywn\\w*)|działa\\s+(?:od\\s+razu|natychmiast|dalej)') },
    // THE BARE NOUN WAS METATEXT, NOT A PROMISE. `obietnic\w+` and `gwarancj\w+`
    // on their own matched the sentences that TALK ABOUT promises while making
    // none — "To nie jest obietnica, że dane są bezpieczne w mojej chmurze",
    // "Plik, który nigdzie nie pojechał, nie potrzebuje obietnicy". Both are the
    // author explicitly declining to promise, and both were being counted as
    // promises; on a page whose whole argument is "do not trust me, check", the
    // pattern found the argument and called it the thing it argues against.
    //
    // `obietnic\w+` is gone outright: the noun never marks a commitment, only
    // commentary on one. `gwarancj\w+` survives only where something is
    // guaranteed — a collocation, not the bare word. What is actually promised
    // in the first person ("gwarantujemy") was never here; it is in the sure
    // tier and untouched by this.
    { area: 'guarantee',    form: 'nominal', re: bounded('gwarancj[aęi]\\s+(?:zwrotu|satysfakcji|jakości|dostępności|\\d+)|z\\s+gwarancją|gwarancj[aęi]\\s+na\\s+\\w+|zobowiązuj[eę]\\s+się|gotow\\w+\\s+(?:poprawk\\w+|łatk\\w+|rozwiązani\\w+|odpowiedź)') },
    { area: 'guarantee',    form: 'subject', re: bounded('(?:program|serwis|strona|aplikacja|system)\\s+(?:gwarantuje|zapewnia)') },
  ],
  en: [
    { area: 'deletion',     form: 'passive', re: bounded('(?:is|are|was|were|gets?|get)\\s+(?:[^\\s]+\\s+){0,2}?(?:deleted|removed|erased|wiped|purged)|permanently\\s+deleted') },
    { area: 'transmission', form: 'passive', re: bounded('(?:is|are|was|were)\\s+(?:[^\\s]+\\s+){0,2}?(?:sent|transmitted|uploaded)') },
    { area: 'transmission', form: 'subject', re: bounded('never\\s+(?:leaves|leave)|(?:does\\s+not|do\\s+not|doesn.t|don.t)\\s+leave|stays?\\s+on\\s+your|remains?\\s+on\\s+your') },
    { area: 'storage',      form: 'passive', re: bounded('(?:is|are|was|were)\\s+(?:[^\\s]+\\s+){0,2}?(?:stored|kept|retained|saved|logged|collected)') },
    { area: 'encryption',   form: 'passive', re: bounded('(?:is|are)\\s+(?:[^\\s]+\\s+){0,2}?(?:encrypted|hashed|anonymised|anonymized)|end-to-end\\s+encrypted|stored\\s+as\\s+a\\s+hash') },
    { area: 'sharing',      form: 'passive', re: bounded('(?:is|are)\\s+(?:never\\s+|not\\s+)?(?:[^\\s]+\\s+){0,2}?(?:shared|sold|disclosed|passed\\s+on|published)') },
    { area: 'response',     form: 'nominal', re: bounded('repl(?:y|ies)\\s+within|response\\s+within|answer\\s+within|(?:you.ll|you\\s+will)\\s+(?:hear|get)\\s+(?:back|an\\s+answer)|response\\s+time') },
    { area: 'payment',      form: 'nominal', re: bounded('refunded|money\\s+back|full\\s+refund|refund\\s+within|no\\s+(?:extra\\s+)?charge') },
    { area: 'access',       form: 'subject', re: bounded('(?:is|are)\\s+(?:immediately\\s+|instantly\\s+)?(?:unlocked|enabled|activated|available)|activates?\\s+(?:immediately|right\\s+away)|works?\\s+right\\s+away') },
    // Bare `guarantee` is the noun in "no guarantee that…" — see the Polish
    // note above; the same metatext problem, the same fix.
    { area: 'guarantee',    form: 'nominal', re: bounded('money[-\\s]back\\s+guarantee|guaranteed\\s+\\w+|\\w+\\s+is\\s+guaranteed|our\\s+(?:promise|commitment)\\s+(?:is|to)|ready[-\\s]to[-\\s]paste\\s+\\w+|ready\\s+fix') },
  ],
  de: [
    { area: 'deletion',     form: 'passive', re: bounded('(?:wird|werden|wurde|wurden)\\s+(?:[^\\s]+\\s+){0,3}?(?:gelöscht|entfernt|vernichtet)|endgültig\\s+gelöscht') },
    { area: 'transmission', form: 'passive', re: bounded('(?:wird|werden|wurde|wurden)\\s+(?:[^\\s]+\\s+){0,3}?(?:gesendet|geschickt|übertragen|hochgeladen)|verlässt\\s+(?:[^\\s]+\\s+){0,3}?nicht|bleibt\\s+auf\\s+(?:Ihrem|deinem)|bleiben\\s+auf\\s+(?:Ihrem|deinem)') },
    { area: 'storage',      form: 'passive', re: bounded('(?:wird|werden|wurde|wurden)\\s+(?:[^\\s]+\\s+){0,3}?(?:gespeichert|aufbewahrt|gesammelt|protokolliert)') },
    { area: 'encryption',   form: 'passive', re: bounded('(?:wird|werden|ist|sind)\\s+(?:[^\\s]+\\s+){0,3}?(?:verschlüsselt|anonymisiert|gehasht)|Ende-zu-Ende-verschlüsselt') },
    { area: 'sharing',      form: 'passive', re: bounded('(?:wird|werden)\\s+(?:nicht\\s+|niemals\\s+)?(?:[^\\s]+\\s+){0,3}?(?:weitergegeben|verkauft|offengelegt|veröffentlicht)') },
    { area: 'response',     form: 'nominal', re: bounded('Antwort\\s+(?:innerhalb|binnen)|antworten\\s+wir|Reaktionszeit|melden\\s+wir\\s+uns') },
    { area: 'payment',      form: 'nominal', re: bounded('Rückerstattung|Geld\\s+zurück|erstattet|Widerrufsrecht|ohne\\s+(?:zusätzliche\\s+)?Kosten') },
    { area: 'access',       form: 'subject', re: bounded('(?:wird|werden|ist|sind)\\s+(?:sofort\\s+)?(?:freigeschaltet|aktiviert|verfügbar)|schaltet\\s+sich\\s+(?:sofort\\s+)?frei|sofort\\s+nutzbar') },
    // `garantiert` alone is also the ADVERB "certainly", which promises nothing.
    { area: 'guarantee',    form: 'nominal', re: bounded('Geld[-\\s]zurück[-\\s]Garantie|Garantie\\s+(?:auf|für)\\s+\\w+|garantiert\\s+(?:gelöscht|sicher|verfügbar|erstattet)|Zusicherung|unser\\s+Versprechen|fertige[rns]?\\s+(?:Korrektur|Lösung|Patch)') },
  ],
  es: [
    { area: 'deletion',     form: 'passive', re: bounded('(?:es|son|está|están|queda|quedan|serán|será)\\s+(?:[^\\s]+\\s+){0,2}?(?:eliminad\\w*|borrad\\w*|suprimid\\w*|destruid\\w*)|se\\s+elimina\\w*|se\\s+borra\\w*') },
    { area: 'transmission', form: 'passive', re: bounded('(?:es|son|será|serán)\\s+(?:[^\\s]+\\s+){0,2}?(?:enviad\\w*|transmitid\\w*|subid\\w*)|nunca\\s+se\\s+env\\w*') },
    { area: 'transmission', form: 'subject', re: bounded('no\\s+sale\\s+de|no\\s+salen\\s+de|permanece\\s+en\\s+tu|permanecen\\s+en\\s+tu') },
    { area: 'storage',      form: 'passive', re: bounded('(?:es|son|está|están|queda|quedan)\\s+(?:[^\\s]+\\s+){0,2}?(?:almacenad\\w*|guardad\\w*|conservad\\w*|registrad\\w*)|se\\s+almacena\\w*|se\\s+guarda\\w*') },
    { area: 'encryption',   form: 'passive', re: bounded('(?:es|son|está|están)\\s+(?:[^\\s]+\\s+){0,2}?(?:cifrad\\w*|encriptad\\w*|anonimizad\\w*)|se\\s+cifra\\w*|cifrado\\s+de\\s+extremo') },
    { area: 'sharing',      form: 'passive', re: bounded('(?:no\\s+)?(?:es|son|será|serán)\\s+(?:[^\\s]+\\s+){0,2}?(?:compartid\\w*|vendid\\w*|divulgad\\w*|publicad\\w*)|no\\s+se\\s+comparte\\w*|no\\s+se\\s+vende\\w*') },
    { area: 'response',     form: 'nominal', re: bounded('respuesta\\s+en\\s+(?:un\\s+plazo|menos|\\d+)|responde(?:mos|remos)\\s+en|tiempo\\s+de\\s+respuesta|recibirás\\s+(?:una\\s+)?respuesta') },
    { area: 'payment',      form: 'nominal', re: bounded('reembolso|devolución\\s+(?:del\\s+)?(?:dinero|importe)|derecho\\s+de\\s+desistimiento|sin\\s+(?:coste|cargo)s?\\s+adicionales?') },
    { area: 'access',       form: 'subject', re: bounded('se\\s+(?:activa|desbloquea|habilita)\\s*(?:de\\s+inmediato|al\\s+instante)?|(?:está|están)\\s+(?:disponible|disponibles|activ\\w*)\\s*(?:de\\s+inmediato)?|funciona\\s+(?:de\\s+inmediato|al\\s+instante)') },
    // "Borrado garantizado" IS a promise — the participle qualifies a noun and
    // says the deletion is assured. The bare noun `garantía` is not.
    { area: 'guarantee',    form: 'nominal', re: bounded('garantía\\s+de\\s+\\w+|\\w+\\s+garantizad[oa]s?|garantizad[oa]s?\\s+\\w+|nuestro\\s+compromiso|nuestra\\s+promesa|(?:corrección|solución)\\s+list\\w*') },
  ],
};

// ---------------------------------------------------------------- negation
//
// "nie udostepniamy" IS A PROMISE — arguably the strongest kind, because the
// only way to keep it is for the code to do nothing. It has to be recorded as
// a promise WITH ITS SIGN, because stage two looks for the opposite thing: an
// affirmative deletion promise sends you to find a delete that runs, a negated
// sharing promise sends you to find a call that must not exist.
//
// Scanned over the words immediately before the verb, not the whole sentence:
// "usuwamy dane, nie przechowujemy kopii" negates the second verb only.
const NEGATION = {
  pl: /\b(nie|nigdy|żaden|żadna|żadne|żadnych|bez|nic)\b/i,
  en: /\b(not|never|no|none|without|don't|doesn't|won't|cannot|can't)\b/i,
  de: /\b(nicht|nie|niemals|kein|keine|keinen|keinem|keiner|ohne)\b/i,
  es: /\b(no|nunca|jamás|ningún|ninguna|ningunos|sin|nada)\b/i,
};
const NEGATION_WINDOW = 40;   // characters before the verb

// GERMAN NEGATES AFTER THE VERB, and this is not an edge case — it is where the
// particle normally goes: "Ihre Daten löschen wir nicht", "Wir geben Daten nicht
// weiter". Reading only backwards recorded those as AFFIRMATIVE promises to
// delete and to pass data on, i.e. the exact opposite of what the sentence says,
// and the sign is what stage two searches on. The other three languages put the
// particle in front ("nie usuwamy", "we do not delete", "no compartimos"), so
// they get no forward window — widening it there would let the negation of the
// NEXT clause leak into this one.
const NEGATION_AFTER = { de: 30 };

// ---------------------------------------------------------------- qualifiers
//
// WHAT MAKES A PROMISE CHECKABLE. "usuwamy dane" is vague; "usuwamy WSZYSTKIE
// dane W CIAGU 24 GODZIN" can be held against the code. Both qualifiers are the
// exact words the first real defect turned on: the mail said "wszystkie Twoje
// sny, analizy i wygenerowane obrazy", and the deletion covered one bucket of
// three. Without the word "wszystkie" that mail would have been true.
//
// Recorded here, unused at this stage, because stage two cannot recover them:
// by then the sentence has been reduced to a fingerprint.
const QUALIFIERS = {
  time: {
    pl: /\b(?:w\s+ciągu\s+\d+\s*\w*|w\s+ciągu\s+(?:doby|godziny|tygodnia|miesiąca)|do\s+\d+\s*(?:godzin\w*|dni|dób)|natychmiast\w*|niezwłocznie|od\s+razu|bezzwłocznie|w\s+\d+\s*(?:godzin\w*|dni|minut\w*)|\d+\s*(?:godzin\w*|dni|dób)\b)/gi,
    en: /\b(?:within\s+\d+\s*\w*|within\s+(?:a|one)\s+(?:day|hour|week|month)|in\s+under\s+\d+\s*\w*|immediately|instantly|right\s+away|straight\s+away|same\s+day|\d+\s*(?:hours?|days?|minutes?)\b)/gi,
    de: /\b(?:innerhalb\s+von\s+\d+\s*\w*|innerhalb\s+(?:eines|einer)\s+\w+|binnen\s+\d+\s*\w*|sofort|umgehend|unverzüglich|\d+\s*(?:Stunden?|Tagen?|Minuten?)\b)/gi,
    es: /\b(?:en\s+un\s+plazo\s+de\s+\d+\s*\w*|en\s+menos\s+de\s+\d+\s*\w*|en\s+\d+\s*(?:horas?|días?|minutos?)|inmediatamente|al\s+instante|de\s+inmediato|\d+\s*(?:horas?|días?)\b)/gi,
  },
  totality: {
    pl: /\b(?:wszystk\w+|każd\w+|nigdy|zawsze|nic|niczego|żadn\w+|w\s+całości|całkowicie|trwale|bezpowrotnie|na\s+zawsze|wyłącznie|jedynie|tylko)\b/gi,
    en: /\b(?:all|every|any|none|nothing|never|always|entirely|completely|permanently|irreversibly|forever|only|solely|exclusively)\b/gi,
    de: /\b(?:alle[nsmr]?|jede[nsrm]?|nichts|niemals|immer|vollständig|dauerhaft|endgültig|unwiderruflich|ausschließlich|nur)\b/gi,
    es: /\b(?:tod[oa]s?|cada|ningún|ninguna|nada|nunca|siempre|completamente|permanentemente|definitivamente|únicamente|solo|sólo|exclusivamente)\b/gi,
  },
};

// ---------------------------------------------------------------- compiled tables
//
// Built once at load. The Polish table becomes one regex per (area, form); the
// other three become one regex per area over their verb forms, and the person
// is checked separately by the matcher.
function compilePolish() {
  const out = [];
  for (const [area, forms] of Object.entries(PL))
    for (const [form, words] of Object.entries(forms))
      out.push({ area, form, tier: 'sure', re: bounded(anyOf(words)) });
  return out;
}

function compileSubjectLanguage(table) {
  return Object.entries(table).map(([area, words]) => ({ area, re: bounded(anyOf(words)) }));
}

const TABLES = {
  pl: { inflected: compilePolish() },
  en: { verbs: compileSubjectLanguage(EN) },
  de: { verbs: compileSubjectLanguage(DE) },
  es: { verbs: compileSubjectLanguage(ES) },
};

// The speaker, where the language writes one as a separate word.
//
// SPANISH HAS NO ENTRY ON PURPOSE. "nosotros" is normally dropped, so demanding
// it would find almost nothing — "eliminamos tus datos" has no pronoun at all.
// The ending carries the person instead, which is why the Spanish table holds
// first-person-plural forms rather than stems.
const SUBJECT = {
  en: /\b(we|i)\b/gi,
  de: /\b(wir|ich)\b/gi,
};

// Auxiliaries that move a subject-language hit from present into another tense.
// Only English and German need this; in Polish and Spanish the tense is in the
// form, and the table already says which.
const TENSE = {
  en: { future: /\b(will|shall|'ll|going\s+to)\b/i, past: /\b(have|has|had|'ve|already)\b/i },
  de: { future: /\b(werden|wird)\b/i, past: /\b(haben|hat|hatte[n]?|bereits)\b/i },
};

const SUBJECT_WINDOW = 60;   // characters between the subject and its verb

// Obligation, ability and hypothesis — see the note in subjectForm(). `will`
// and `shall` are deliberately ABSENT: those are the future tense, which is
// how a promise about later is normally written ("we will delete"), and TENSE
// above already reads them.
const MODAL = {
  en: /\b(have\s+to|has\s+to|had\s+to|need(?:s|ed)?\s+to|must|can|could|cannot|can't|may|might|would|should|ought\s+to|able\s+to|want(?:s|ed)?\s+to|try(?:ing)?\s+to)\s+(?:\w+\s+){0,2}$/i,
  de: /\b(muss|müssen|müsste|kann|können|könnte|darf|dürfen|möchte|will|wollen|sollte|sollen)\s+(?:\w+\s+){0,3}$/i,
};

// ---------------------------------------------------------------- guessing a language
//
// Used only where the source does not say. An HTML page carries `lang="pl"` and
// an i18n table is keyed by language, so this is the fallback for a string
// hard-coded in JavaScript, where nothing declares what it is written in.
//
// Diacritics decide most of it; stopwords settle the rest. It returns null
// rather than a guess when nothing scores, because attributing a sentence to
// the wrong language silently applies the wrong dictionary to it.
// THE FIRST LIST WAS TOO THIN TO USE. It held eleven Polish stopwords and
// scored "Nagranie nie opuszcza Twojego komputera." at 1 — one point for `nie`,
// nothing for the rest, no diacritic anywhere in the sentence — so the guess
// came back null and a plain Polish promise was skipped entirely. A short list
// does not fail loudly here; it fails as an unrecognised sentence, which looks
// exactly like a sentence that promises nothing.
//
// So the lists are long, and they are function words: the ones a sentence
// cannot avoid. Case-folded `Twoj\w+` and `Ihr\w+` are in because possessives
// addressed to the customer are what promise copy is made of.
const HINTS = {
  pl: [/[ąćęłńóśźż]/gi,
    /\b(nie|jest|są|się|oraz|tylko|także|który|która|które|twoj\w+|swoj\w+|dane|danych|zostaje|zostają|przez|przy|aby|jak|gdy|lub|ani|jeśli|może|można|wszystk\w+|nic|już|bez|dla|tego|tym|nagranie|konto)\b/gi],
  de: [/[äöüß]/gi,
    /\b(und|nicht|werden|wird|wurde|ihre|ihren|ihrem|daten|oder|auf|dem|den|die|der|das|ein|eine|nur|auch|noch|sich|von|mit|für|bei|wir|nach|wenn)\b/gi],
  es: [/[ñáéíóú¿¡]/gi,
    /\b(no|que|para|con|los|las|una|unos|tus|tu|datos|se|del|de|por|como|más|pero|sus|este|esta|todo|todos|nunca|siempre|sin)\b/gi],
  en: [/\b(the|and|not|your|data|we|is|are|of|to|will|that|this|with|for|from|you|our|any|all|never|only|it|be|on|in)\b/gi],
};

/**
 * The language a piece of text is written in, or null.
 *
 * IT RETURNS NULL RATHER THAN A GUESS. Attributing a sentence to the wrong
 * language runs the wrong dictionary over it, which finds nothing and reports
 * nothing — indistinguishable from a sentence that makes no promise. An honest
 * "I do not know" can at least be counted and shown.
 *
 * Only needed where the source is silent. An HTML page declares `lang="pl"` and
 * a translation table is keyed by language; this is for a string hard-coded in
 * JavaScript, where nothing says.
 */
export function guessLanguage(text) {
  const s = String(text || '');
  if (s.trim().length < 8) return null;
  let best = null, bestScore = 0, runnerUp = 0;
  for (const [lang, tests] of Object.entries(HINTS)) {
    let score = 0;
    for (const re of tests) { re.lastIndex = 0; score += (s.match(re) || []).length; }
    if (score > bestScore) { runnerUp = bestScore; bestScore = score; best = lang; }
    else if (score > runnerUp) runnerUp = score;
  }
  // A tie is not a result. Short strings hit shared function words — Spanish
  // `no` and Polish `nie`, German `die` and English `the` — and picking the
  // first of two equal scores would decide by the order of this object.
  return bestScore >= 2 && bestScore > runnerUp ? best : null;
}

// ---------------------------------------------------------------- recognition

function isNegated(text, index, matched, lang) {
  const from = Math.max(0, index - NEGATION_WINDOW);
  if (NEGATION[lang].test(text.slice(from, index))) return true;
  // INSIDE THE MATCH TOO, for the same reason the subject can be there: a
  // German separable verb brackets its own negation. "geben wir nicht weiter"
  // is one match containing the `nicht`, and reading only the edges recorded a
  // promise to pass data on where the sentence promises the opposite.
  if (NEGATION[lang].test(matched)) return true;
  const ahead = NEGATION_AFTER[lang];
  if (!ahead) return false;
  const start = index + matched.length;
  return NEGATION[lang].test(text.slice(start, start + ahead));
}

function qualifiersIn(text, lang) {
  const time = [...new Set((text.match(QUALIFIERS.time[lang]) || []).map(s => s.trim()))];
  const totality = [...new Set((text.match(QUALIFIERS.totality[lang]) || []).map(s => s.trim()))];
  return { time, totality };
}

/**
 * Every promise in one sentence.
 *
 * @param sentence  one sentence of client-facing text, already stripped of markup
 * @param lang      'pl' | 'en' | 'de' | 'es'; when omitted it is guessed
 * @returns array of { area, form, tier, match, index, negated, qualifiers, lang }
 *
 * A sentence can hold more than one: "usuwamy nagrania i nie przechowujemy
 * kopii" is two promises in two areas, and collapsing them to one would lose
 * the second the moment the first is satisfied by the code.
 */
export function recognise(sentence, lang) {
  const text = String(sentence || '');
  const L = lang || guessLanguage(text);
  if (!L || !TABLES[L]) return [];

  const quals = qualifiersIn(text, L);
  const raw = [];
  const add = (rule, m, form, tier) => raw.push({
    lang: L, area: rule.area, form, tier,
    match: m[0].trim(), index: m.index, end: m.index + m[0].length,
    negated: isNegated(text, m.index, m[0], L), qualifiers: quals,
  });

  const scan = (rule, handle) => {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      handle(rule, m);
      if (m[0].length === 0) rule.re.lastIndex++;   // a zero-width match would spin here
    }
  };

  if (L === 'pl') {
    for (const rule of TABLES.pl.inflected) scan(rule, (r, m) => add(r, m, r.form, 'sure'));
  } else {
    for (const rule of TABLES[L].verbs) scan(rule, (r, m) => {
      const form = subjectForm(text, m.index, m[0], L);
      if (form) add(r, m, form, 'sure');           // a verb with nobody behind it is not a promise
    });
  }
  for (const rule of EDGE[L] || []) scan(rule, (r, m) => add(r, m, r.form, 'edge'));

  // ------------------------------------------------------------- overlaps
  //
  // ONE COMMITMENT MUST COUNT ONCE. "Hasło jest przechowywane" matches the
  // storage rule for `jest + przechowywan…` AND the bare-participle rule for
  // `przechowywane`, at overlapping spans — two promises where the sentence
  // makes one, and both would have gone into the total. Measured on the first
  // run, that inflation was worth roughly a third of the edge tier, all of it
  // in exactly the areas whose patterns are written two ways.
  //
  // Overlap is judged WITHIN AN AREA, never across. "Das Passwort wird
  // verschlüsselt gespeichert" is genuinely two promises — encryption and
  // storage — over almost the same words, and collapsing them by position
  // would silently drop whichever sorted second.
  //
  // The survivor is the strongest, then the longest: `sure` before `edge`
  // because it names its author, and the longer span before the shorter
  // because it carries more of the sentence into the report.
  raw.sort((a, b) =>
    (a.tier === b.tier ? 0 : a.tier === 'sure' ? -1 : 1) ||
    (b.end - b.index) - (a.end - a.index) ||
    a.index - b.index);

  const kept = [];
  for (const h of raw) {
    const clash = kept.some(k => k.area === h.area && h.index < k.end && k.index < h.end);
    if (!clash) kept.push(h);
  }

  kept.sort((a, b) => a.index - b.index);
  return kept;
}

/**
 * Is there a speaker behind this verb, and in what tense?
 *
 * GERMAN LOOKS BOTH WAYS. It puts the verb at the end of a subordinate clause —
 * "damit wir Ihre Daten löschen" — and inverts in a main clause — "Ihre Daten
 * löschen wir nicht". Searching only backwards from the verb found the first
 * and missed the second, which is the shape most German privacy copy uses.
 * English looks backwards only: "we delete", never "delete we".
 */
function subjectForm(text, index, matched, lang) {
  if (lang === 'es') {
    // The ending IS the person, for the finite forms. The only thing left to
    // decide is the tense.
    const before = text.slice(Math.max(0, index - 30), index);

    // A PARTICIPLE IS NOT A PERSON. `enviado`, `guardado`, `cifrado` are in the
    // table for one construction only — "hemos enviado" — but on their own they
    // are also the impersonal passive and the plain adjective, and both were
    // counted as first-person promises on the first run:
    //     "Todavía no se ha enviado ninguna incidencia"   -> impersonal
    //     "basta con «no se abre un proyecto guardado»"   -> adjective
    // Neither has an author, so neither belongs in `sure`. Without the
    // auxiliary the participle is left to the edge patterns, which is where the
    // passive was always meant to land.
    if (/(?:ad|id)[oa]s?$/i.test(matched)) {
      return /\b(hemos|habíamos|hubimos|habremos)\b/i.test(before) ? 'we-did' : null;
    }

    if (/\b(hemos|habíamos|hubimos)\b/i.test(before)) return 'we-did';
    if (/\b(vamos\s+a)\b/i.test(before)) return 'we-will';
    return /remos\b/i.test(matched) ? 'we-will' : 'we-now';
  }

  // THE WINDOW STOPS AT THE END OF THE CLAUSE. Sixty characters of lookback
  // reaches across a colon or a full stop into a sentence with a different
  // subject, and it attributed somebody else's verb to the speaker:
  //     "We are not quoting a figure: NCH does not publish one"
  // was recorded as "we do not publish", a promise the page never makes, about
  // a company that is not the author. The boundary characters below are the
  // ones that end a clause; a comma is deliberately NOT among them, because
  // "we read it, store it and delete it" is one clause with one subject.
  const from = Math.max(0, index - SUBJECT_WINDOW);
  let before = text.slice(from, index);
  const cut = Math.max(before.lastIndexOf('. '), before.lastIndexOf(': '),
    before.lastIndexOf('; '), before.lastIndexOf(' — '), before.lastIndexOf(' – '));
  if (cut >= 0) before = before.slice(cut + 1);

  // A SUBORDINATING CONJUNCTION HANDS THE VERB TO SOMEBODY ELSE. There is no
  // punctuation in "I read that Upheal stores recordings for 30 days", so the
  // clause cut above leaves `I` as the nearest subject and the sentence was
  // recorded as a storage promise by the author — about a competitor's product,
  // in a page whose whole point is that this program does the opposite. After
  // `that` / `że` / `dass` / `que` a new clause begins with a new subject, so
  // the window stops there and the verb is left without a speaker.
  const sub = /\b(that|which|whether|because|since|although|że|iż|bo|ponieważ|który|która|dass|weil|obwohl|welche[rns]?|que|porque|aunque|cual)\b/gi;
  let lastSub = -1, sm;
  sub.lastIndex = 0;
  while ((sm = sub.exec(before)) !== null) lastSub = sm.index + sm[0].length;
  if (lastSub >= 0) before = before.slice(lastSub);
  const after = lang === 'de' ? text.slice(index + matched.length, index + matched.length + 20) : '';

  // A MODAL IS NOT A COMMITMENT. "for the tool to do anything with it, I have
  // to send a session recording to a server I know nothing about" was recorded
  // as a promise to send — on a page arguing that this is exactly what the
  // author refuses to build. Obligation, ability and hypothesis all take the
  // bare verb in English and German, so the verb alone cannot tell them from a
  // statement of what will happen. "I have to send" describes a predicament;
  // "I send" promises. Only the second is binding.
  if (MODAL[lang] && MODAL[lang].test(before)) return null;

  SUBJECT[lang].lastIndex = 0;
  const beforeSubjects = before.match(SUBJECT[lang]) || [];
  const afterSubjects = after.match(SUBJECT[lang]) || [];
  // THE SUBJECT CAN BE INSIDE THE MATCH. A German separable verb brackets the
  // clause — "Ihre Daten geben WIR nicht weiter" — so the span from `geben` to
  // `weiter` swallows the pronoun whole. Looking only before and after the
  // match found nothing and dropped the sentence, which is how the single most
  // important promise in a privacy policy went missing while the same sentence
  // written as "Wir geben nichts weiter" was found.
  const insideSubjects = matched.match(SUBJECT[lang]) || [];
  const subject = beforeSubjects[beforeSubjects.length - 1] || insideSubjects[0] || afterSubjects[0];
  if (!subject) return null;

  const singular = /^(i|ich)$/i.test(subject);
  const window = before + ' ' + after;
  const tense = TENSE[lang].future.test(window) ? 'will'
    : TENSE[lang].past.test(window) ? 'did'
      : 'now';
  return (singular ? 'i-' : 'we-') + tense;
}

/** The strongest promise in a sentence: `sure` beats `edge`, earlier beats later. */
export function strongest(hits) {
  if (!hits || hits.length === 0) return null;
  const sure = hits.filter(h => h.tier === 'sure');
  return (sure.length ? sure : hits)[0];
}

/**
 * How many forms the dictionary holds, per language. Printed by a run so that a
 * low count of found promises can be told apart from a thin dictionary — the
 * two look identical in a total.
 */
export function lexiconSize() {
  const count = (t) => Object.values(t).reduce((n, v) =>
    n + (Array.isArray(v) ? v.length : Object.values(v).reduce((k, w) => k + w.length, 0)), 0);
  return {
    pl: count(PL), en: count(EN), de: count(DE), es: count(ES),
    edge: Object.values(EDGE).reduce((n, v) => n + v.length, 0),
  };
}

export const _tables = { PL, EN, DE, ES, EDGE };
