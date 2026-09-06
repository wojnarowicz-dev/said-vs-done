// said-vs-done — messages in two languages.
//
// EVERY string a person sees lives HERE, not in the collectors. A collector
// calls `t('key', args)` and does not know which language it is writing in.
// Spreading translations across files ends with half the output stuck in one
// language — and that is only visible to somebody who does not speak it.
//
// English is the default, because the repository goes to GitHub. `--lang pl`
// switches to Polish.
//
// WE DO NOT TRANSLATE: file paths, i18n keys, verdict names, area names or flag
// names. Those are data, not prose. Verdicts in particular stay in English on
// purpose — `no-witness` is an identifier that appears in the snapshot JSON,
// and a snapshot whose contents change with `--lang` cannot be diffed against
// one written by a colleague running the other language.
//
// TAKEN FROM odd-one-out: the `t()` mechanism and the argument substitution.
// The dictionary itself is this tool's own.
import { valueOf } from './args.mjs';

const argv = process.argv.slice(2);
const LANG = String(valueOf(argv, 'lang', 'en')).toLowerCase() === 'pl' ? 'pl' : 'en';

export const language = LANG;

const S = {
  // ---------- shared ----------
  'root': { en: 'text=', pl: 'tekst=' },
  'settings': { en: 'settings: ', pl: 'ustawienia: ' },
  'savedRun': { en: 'run snapshot saved: {0}  (promises: {1})', pl: 'zapis przebiegu: {0}  (obietnic: {1})' },
  'noReason': { en: '(no reason given)', pl: '(bez podania powodu)' },
  'hex': { en: 'hex', pl: 'hex' },

  // ---------- snapshot ----------
  'snapshotNeedsPath': {
    en: '!! --json needs the path of a file to write.',
    pl: '!! --json wymaga sciezki pliku do zapisania.',
  },
  'snapshotUnreadable': {
    en: '!! The previous run at {0} could not be read ({1}).',
    pl: '!! Poprzedniego przebiegu z {0} nie da sie odczytac ({1}).',
  },
  'snapshotUnreadableHint': {
    en: '   Everything below is reported as new, because there is nothing to compare with.',
    pl: '   Wszystko ponizej jest zgloszone jako nowe, bo nie ma z czym porownac.',
  },
  'snapshotBadVersion': {
    en: 'snapshot version {0}, expected {1}',
    pl: 'zapis w wersji {0}, oczekiwano {1}',
  },
  'snapshotWriteFailed': {
    en: '!! Could not write the run to {0}: {1}',
    pl: '!! Nie udalo sie zapisac przebiegu do {0}: {1}',
  },
  'snapshotWriteHintDir': {
    en: '   --json takes the path of a FILE to write, and that is a directory.',
    pl: '   --json bierze sciezke PLIKU do zapisania, a to jest katalog.',
  },

  // ---------- input ----------
  'inputMissingArg': { en: '!! Missing argument: {0}', pl: '!! Brakuje argumentu: {0}' },
  'inputNoSuchPath': { en: '!! There is no such path: {0}', pl: '!! Nie ma takiej sciezki: {0}' },
  'inputNotDir': { en: '!! This is not a directory: {0}', pl: '!! To nie jest katalog: {0}' },
  'inputNotFile': { en: '!! This is not a file: {0}', pl: '!! To nie jest plik: {0}' },
  'inputUnreadable': { en: '!! Cannot read {0} ({1}).', pl: '!! Nie da sie odczytac {0} ({1}).' },
  'inputHintPath': { en: '   Check the path and try again.', pl: '   Sprawdz sciezke i sprobuj ponownie.' },
  'inputHintDir': { en: '   This argument takes a directory.', pl: '   Ten argument bierze katalog.' },
  'inputHintFile': { en: '   This argument takes a file.', pl: '   Ten argument bierze plik.' },
  'nonUtf8Files': {
    en: '!! {0} file(s) were not valid UTF-8 and were read with replacement characters: {1}',
    pl: '!! {0} plik(ow) nie bylo poprawnym UTF-8 i zostalo odczytanych ze znakami zastepczymi: {1}',
  },

  'unreadableFiles': {
    en: '!! {0} file(s) could not be read and were skipped: {1}',
    pl: '!! {0} plik(ow) nie dalo sie odczytac i zostalo pominietych: {1}',
  },
  'unreadableHint': {
    en: '   Their promises are NOT in the totals above. This is not the same as having none.',
    pl: '   Ich obietnic NIE MA w powyzszych liczbach. To nie to samo, co ich brak.',
  },

  // ---------- config ----------
  'configUnreadable': { en: '!! Cannot read the configuration {0}: {1}', pl: '!! Nie da sie odczytac konfiguracji {0}: {1}' },
  'configFallback': { en: '   Running with the built-in defaults.', pl: '   Dzialam na wbudowanych ustawieniach domyslnych.' },
  'exclusions': { en: 'exclusions: {0}', pl: 'wykluczen: {0}' },
  'defaults': { en: ' (defaults)', pl: ' (domyslne)' },
  'mutes': { en: ', mutes: {0}', pl: ', wyciszen: {0}' },
  'mutedByComment': { en: 'muted by a comment in the text: {0}', pl: 'wyciszone komentarzem w tekscie: {0}' },
  'mutedByConfig': { en: 'muted by configuration: {0}', pl: 'wyciszone konfiguracja: {0}' },

  // ---------- population ----------
  'tooLittleData': { en: 'TOO LITTLE DATA: {0}, threshold {1}.', pl: 'ZA MALO DANYCH: {0}, prog {1}.' },
  'tooLittleDataHint': { en: '   Come back when there are {0}.', pl: '   Wroc, gdy bedzie ich {0}.' },
  'noSourcesFound': { en: 'No {0} files found in {1}.', pl: 'Nie znaleziono plikow {0} w {1}.' },
  'noSourcesHint': {
    en: '   said-vs-done reads client-facing text: .html, .js/.ts translation tables, .md.',
    pl: '   said-vs-done czyta tekst widoczny dla klienta: .html, tablice tlumaczen .js/.ts, .md.',
  },

  // ---------- diff ----------
  'diffTitle': { en: '# said-vs-done — diff between two runs', pl: '# said-vs-done — roznica miedzy dwoma przebiegami' },
  'diffDetector': { en: 'stage={0}  text={1}', pl: 'etap={0}  tekst={1}' },
  'diffWhen': { en: 'previous: {0}   current: {1}', pl: 'poprzedni: {0}   biezacy: {1}' },
  'diffWarnDetectors': { en: '!! Different stages: {0} vs {1}', pl: '!! Rozne etapy: {0} vs {1}' },
  'diffWarnThresholds': { en: '!! Different settings: "{0}" vs "{1}"', pl: '!! Rozne ustawienia: "{0}" vs "{1}"' },
  'diffCounts': { en: 'new={0}  gone={1}  changed={2}  unchanged={3}', pl: 'nowych={0}  zniklo={1}  zmienionych={2}  bez zmian={3}' },
  'diffVsPrevious': { en: 'vs previous run: new={0}  gone={1}  changed={2}  unchanged={3}', pl: 'wzgledem poprzedniego przebiegu: nowych={0}  zniklo={1}  zmienionych={2}  bez zmian={3}' },
  'diffSecNew': { en: 'NEW', pl: 'NOWE' },
  'diffSecGone': { en: 'GONE', pl: 'ZNIKNELY' },
  'diffSecGoneHint': { en: '   (removed from the text, or reworded)', pl: '   (usuniete z tekstu albo przeredagowane)' },
  'diffSecChanged': { en: 'CHANGED', pl: 'ZMIENIONE' },
  'diffSecUnchanged': { en: 'UNCHANGED', pl: 'BEZ ZMIAN' },
  'diffNoChange': { en: 'Nothing changed since the previous run.', pl: 'Nic sie nie zmienilo od poprzedniego przebiegu.' },
  'diffNeedsTwo': { en: '!! diff needs exactly two snapshot files.', pl: '!! diff wymaga dokladnie dwoch plikow zapisu.' },
  'onlyNewShown': { en: '  (only what is new is shown; --all for everything)', pl: '  (pokazane tylko nowe; --all dla wszystkiego)' },

  // ---------- say: stage one ----------
  'sayTitle': { en: '# said-vs-done / say: promises made to the customer', pl: '# said-vs-done / say: obietnice skladane klientowi' },
  'sayStats': { en: 'files={0}  sentences={1}  language unknown={2}', pl: 'plikow={0}  zdan={1}  jezyk nierozpoznany={2}' },
  'sayLexicon': { en: 'dictionary: pl={0} en={1} de={2} es={3}, edge patterns={4}', pl: 'slownik: pl={0} en={1} de={2} es={3}, wzorcow granicznych={4}' },
  'sayCounts': { en: 'PROMISES={0}   sure={1}  edge={2}', pl: 'OBIETNIC={0}   pewnych={1}  na granicy={2}' },
  'sayByLang': { en: 'by language : {0}', pl: 'wg jezyka   : {0}' },
  'sayByArea': { en: 'by area     : {0}', pl: 'wg obszaru  : {0}' },
  'sayByForm': { en: 'by form     : {0}', pl: 'wg formy    : {0}' },
  'sayTierHint': {
    en: '\n-> `sure` names its author with a grammatical person. `edge` makes the same\n   commitment with the author removed — a passive, the product as subject, or\n   a bare noun phrase. Both are promises; only the first says who is bound.',
    pl: '\n-> `sure` nazywa autora osoba gramatyczna. `edge` sklada to samo\n   zobowiazanie bez autora — strona bierna, produkt jako podmiot albo sama\n   fraza rzeczownikowa. Obie sa obietnicami; tylko pierwsza mowi, kto jest zwiazany.',
  },

  // ---------- done: stage two ----------
  'doneTitle': { en: '# said-vs-done / done: is there anything in the code that keeps them', pl: '# said-vs-done / done: czy w kodzie jest cos, co je spelnia' },
  'doneCodeRoot': { en: 'code : {0}   ({1} files)', pl: 'kod  : {0}   ({1} plikow)' },
  'doneCounts': { en: 'promises(sure)={0}   code files indexed={1}', pl: 'obietnic(pewnych)={0}   zaindeksowanych plikow kodu={1}' },
  'doneVerdicts': { en: 'VERDICTS: {0}', pl: 'WERDYKTY: {0}' },

  // THE SCOPE BANNER. This is the message that exists because the tool once
  // reported a promise as unkept while the code that keeps it sat in a
  // repository nobody had told it about.
  'doneNoScope1': { en: '!! NO --code GIVEN. The code searched is the same directory the text came from.', pl: '!! NIE PODANO --code. Przeszukany kod to ten sam katalog, z ktorego wziety jest tekst.' },
  'doneNoScope2': { en: '   In a project split across repositories that is the wrong place, and every', pl: '   Przy projekcie rozbitym na kilka repozytoriow to zle miejsce, a kazde' },
  'doneNoScope3': { en: '   "no-witness" below may mean only "not looked for here".', pl: '   "no-witness" ponizej moze znaczyc tylko "nie szukalem tutaj".' },
  'doneNoScope4': { en: '   Name the repositories that hold the implementation:  --code <path> <path>', pl: '   Wskaz repozytoria z implementacja:  --code <sciezka> <sciezka>' },

  'doneVerdictHelp': {
    en: '\n-> covered     something in the code does it, and where the promise carries a\n                number the number is there too\n   no-witness  the machinery IS in the searched code and nothing keeps the promise\n   elsewhere   the machinery is not in the searched code; nothing here settles it\n   inspect     a negated promise: absence proves nothing, so the places that\n                could break it are listed instead',
    pl: '\n-> covered     cos w kodzie to robi, a przy obietnicy z liczba takze ta liczba\n                sie zgadza\n   no-witness  maszyneria JEST w przeszukanym kodzie i nic nie spelnia obietnicy\n   elsewhere   maszynerii nie ma w przeszukanym kodzie; stad nie da sie rozstrzygnac\n   inspect     obietnica zaprzeczona: absencja niczego nie dowodzi, wiec zamiast\n                werdyktu jest lista miejsc, ktore moglyby ja zlamac',
  },
  'doneSearched': { en: '   searched: {0}', pl: '   przeszukano: {0}' },
  'doneCaveat': { en: '   CAVEAT {0} — the scope was never stated, so this is not a finding.', pl: '   ZASTRZEZENIE {0} — zasieg nie zostal podany, wiec to nie jest ustalenie.' },

  // ---------- help ----------
  'helpTagline': { en: 'said-vs-done — reads the promises made to a customer and checks whether anything in the code keeps them.', pl: 'said-vs-done — czyta obietnice skladane klientowi i sprawdza, czy w kodzie jest cos, co je spelnia.' },
  'helpPrinciple': { en: 'Said against done. It never guesses: a promise it cannot check from the code it was given is reported as unchecked, not as broken.', pl: 'Powiedziane kontra zrobione. Nigdy nie zgaduje: obietnica, ktorej nie da sie sprawdzic w podanym kodzie, jest zglaszana jako niesprawdzona, nie jako zlamana.' },
  'helpUsage': { en: 'Usage:', pl: 'Uzycie:' },
  'helpLangSec': { en: 'Message language:', pl: 'Jezyk komunikatow:' },
  'helpLangEn': { en: '  (default)   English', pl: '  (domyslnie) angielski' },
  'helpLangPl': { en: '  --lang pl   Polish', pl: '  --lang pl   polski' },
  'helpCommands': { en: 'Commands:', pl: 'Polecenia:' },
  'helpOptions': { en: '         options: {0}', pl: '         opcje: {0}' },
  'cmdSay': { en: 'find the promises in client-facing text', pl: 'znajdz obietnice w tekscie widocznym dla klienta' },
  'cmdDone': { en: 'and check whether the code keeps them', pl: 'i sprawdz, czy kod je spelnia' },
  'cmdDiff': { en: 'compare two run snapshots', pl: 'porownaj dwa zapisy przebiegow' },
  'helpExamples': { en: 'Examples:', pl: 'Przyklady:' },
  'helpScopeWarn': {
    en: 'Give every repository that holds the implementation. A project split across\ntwo repositories, checked against one of them, reports its own database as\nmissing.',
    pl: 'Podaj kazde repozytorium z implementacja. Projekt rozbity na dwa repozytoria,\nsprawdzony wzgledem jednego z nich, zglasza wlasna baze jako nieistniejaca.',
  },
  'unknownCommand': { en: '!! Unknown command: {0}', pl: '!! Nieznane polecenie: {0}' },
};

// Exported for test/lang-check.mjs, which compares the two languages key by key.
// It reads the dictionary itself rather than matching the file with a regular
// expression, so what is checked is exactly what ships.
export const messages = S;

export function t(key, ...args) {
  const entry = S[key];
  if (!entry) return '[[' + key + ']]';          // a missing key is visible at once
  let out = entry[LANG] !== undefined ? entry[LANG] : entry.en;
  args.forEach((a, i) => { out = out.split('{' + i + '}').join(String(a)); });
  return out;
}

export default t;
