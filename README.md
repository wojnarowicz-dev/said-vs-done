# said-vs-done

Reads the promises a project makes to its customers and checks whether anything
in the code keeps them. **Said against done.**

A privacy policy says "we delete your reports after 90 days". A terms page says
"we reply within a day". A mail says "we removed all your images". These are
sentences in an HTML file or a translation table, and nothing anywhere connects
them to the code that is supposed to make them true. When the code changes, the
sentence stays.

<!-- svd:claim name=languages value=4 -->
<!-- svd:claim name=areas value=9 -->

Four languages (Polish, English, German, Spanish), nine areas of commitment, two
stages.

---

## The three cases it was built from

Not hypotheticals. Each is a real defect from a real project, and each is why
one part of this tool exists.

1. **A mail said "we removed all your dreams, analyses and generated images."**
   The deletion aimed at an empty bucket — the images were at a third-party
   provider. The sentence was true about one of three things it named.
   → this is why a promise's **numbers and quantifiers are kept** (`all`,
   `90 days`), and why a witness that lacks the number is not coverage.

2. **A page promised a reply within a day.** The mail sender did not work.
   → this is why `response` is an area of its own, and why the tool looks for a
   *transport*, not for good intentions.

3. **Tool help promised "a ready-to-paste fix."** The main detector did not
   produce one.
   → this is why the dictionary has a `nominal` form. That sentence contains no
   verb at all, and a dictionary of verbs walks straight past it.

---

## What one run looks like

    $ said-vs-done say <text-dir>

    # said-vs-done / say: promises made to the customer
    dictionary: pl=232 en=117 de=110 es=73, edge patterns=42
    files=125  sentences=14973  language unknown=28
    PROMISES=369   sure=84  edge=285
    by area     : transmission=162  storage=83  deletion=33  access=31 ...

Then, against the code:

    $ said-vs-done done <text-dir> --code <repo> <repo>

    VERDICTS: covered=55  no-witness=1  inspect=17  elsewhere=11

      no-witness [pl] deletion  Zgłoszenia kasuję po 90 dniach.
            js/i18n.js:883  key=reportRetentionNote  why=witnessWithoutTheNumber
            -> web/js/account-panel.js:1214

---

## Install

    git clone <this repo> && cd said-vs-done

No dependencies. Node 18 or newer — the dictionary uses lookbehind, and nothing
else needs anything.

    $ said-vs-done --help

## Use

    $ said-vs-done say test/fixtures/site
    $ said-vs-done done test/fixtures/site --code test/fixtures/site test/fixtures/app
    $ said-vs-done done test/fixtures/site --code test/fixtures/site test/fixtures/app --only no-witness

`--lang pl` switches every message to Polish. `--json <file>` writes a run
snapshot; run against the same file again and only what is **new** is shown.

---

## Stage one: what counts as a promise

A promise is a sentence that commits somebody to an act. The dictionary is a
lexicon of commitment verbs plus the grammatical marks that say **who** is
committing — not a classifier, and everything it knows is in a table you can
read in `src/promise.mjs`.

<!-- svd:claim name=lexicon.pl value=232 -->
<!-- svd:claim name=lexicon.en value=117 -->
<!-- svd:claim name=lexicon.de value=110 -->
<!-- svd:claim name=lexicon.es value=73 -->
<!-- svd:claim name=lexicon.edge value=42 -->

| language | verb forms |
|---|---|
| Polish | 232 |
| English | 117 |
| German | 110 |
| Spanish | 73 |
| edge patterns (all languages) | 42 |

### Two tiers, and why both are needed

**`sure`** — the sentence names its author with a grammatical person.
*usuwamy*, *we delete*, *wir löschen*, *eliminamos*. Somebody is on the hook and
the sentence says who.

**`edge`** — the same commitment with the author removed:

- a passive — *dane są szyfrowane*
- the product as subject — *nagranie nie opuszcza Twojego komputera*
- a bare noun phrase — *gotowa poprawka*, *odpowiedź w ciągu doby*

The split is a measurement, not decoration. On the first real project the count
came out 84 `sure` against 285 `edge`, and **that ratio is itself the finding**:
the author writes in the first person rarely. A dictionary limited to the first
person — which is what was originally asked for — would have missed four fifths
of what the site promises.

Both tiers matter because the three founding cases span them: *"usunęliśmy
wszystkie Twoje sny"* is `sure`, *"gotowa poprawka do wklejenia"* is `edge`.

### Why Polish gets an explicit wordlist

English, German and Spanish put the speaker in a separate token — `we`, `wir`,
`nosotros` — so a rule can anchor on the subject and stay open to any verb.
Polish carries the person **in the ending**, and there is nothing to anchor on.

The obvious shortcut — "a word ending in `-my` is first person plural" — does
not survive contact with the language. `systemy`, `programy`, `problemy`,
`domy`, `rytmy` are plural **nouns**, and three of them stand on the first page
this tool was ever pointed at. So Polish is an explicit list of inflected forms:
longer, and honest. What is not in the list is not found, and that shows up as a
low `sure` count rather than as noise.

### Negation is recorded, not discarded

*nie udostępniamy* is a promise — arguably the strongest kind, because the only
way to keep it is for the code to do nothing. It is stored **with its sign**,
because stage two inverts the search: an affirmative deletion promise sends you
to find a delete that runs; a negated sharing promise sends you to find a call
that must not exist.

---

## Stage two: four verdicts, not two

<!-- svd:claim name=verdicts value=4 -->

| verdict | meaning |
|---|---|
| `covered` | something in the code does it — and where the promise carries a number, the number is there too |
| `no-witness` | the machinery **is** in the searched code and nothing keeps the promise ← the finding |
| `elsewhere` | the machinery is not in the searched code; nothing here settles it |
| `inspect` | a negated promise: absence proves nothing, so the places that could break it are listed instead |

The obvious design has two verdicts — kept or broken — and it is wrong in the
way that matters most. Point the tool at a website repository and the promise
*"the recording never leaves your computer"* has no code there that could
confirm or deny it: the desktop program lives somewhere else entirely. A
two-state tool answers UNCOVERED, which reads as an accusation that the sentence
is a lie. It is not. The tool simply cannot see the program.

`elsewhere` and `no-witness` must never print as the same thing.

### A negated promise never gets `covered` from absence alone

A tool that ignored the sign would go looking for a sending routine to prove
"we never send", find one — every site has a `fetch` somewhere — and call the
promise kept. That is worse than no answer. So a negated promise gets `inspect`
plus the list of every place that transmits anything, because that list is short
and a person can read it.

---

## The two bugs, and why the second hid the first

This chapter is the most useful thing in this README, because both bugs were in
**this tool**, both looked like findings, and the second one made the first
invisible.

### Bug one: the tool searched one repository and pronounced on the whole project

It reported: *the site promises deletion after 90 days, and nothing in the code
deletes.* Zero `cron`, zero `retention`, zero `expires_at`. The only `90` in the
codebase was in a comment.

The mechanism existed the whole time:

    purge_old_reports()                 migrations/20260830120000_reports.sql
    delete from public.reports
     where created_at < now() - interval '90 days'

It sat in the **program's** repository while the sentence sat in the
**website's**, and the run had been shown only the website. Split a project
across two repositories and every promise the site makes but the database keeps
comes back as a lie.

The failure was not the search. It was that a result meaning *"I had no
material"* was printed in the words of *"I checked and it is not there"* — which
is precisely the class of defect this tool exists to catch, produced by the tool
itself.

**The fix is not just `--code` taking several paths.** It is that an unstated
scope can no longer pass for a finding. A run that was never told where to look
prints a banner before its first verdict, and every `no-witness` from such a run
carries `CAVEAT=scopeUnset`. Verdicts also record the roots they searched, so a
snapshot remembers the basis on which it pronounced.

There was already an `elsewhere` verdict meant to prevent exactly this, and it
did not fire. The `venue` test is per-area, and in the website repository it
**passed** — there are Supabase calls and `localStorage`. The presence of a
place where such a promise *could* be kept had been taken as evidence that the
right place had been searched. Separate question, separate mechanism.

### Bug two: the number was never on the verb's line

Here is what makes the pair worth a chapter. Fix bug one alone and run again on
both repositories, and the verdict is **still wrong** — `witnessWithoutTheNumber`
instead of `no-witness`, a different label on the same false alarm.

An SQL statement breaks across lines. The line that deletes and the line that
says how old is too old are neighbours, not the same line:

    delete from public.reports                  ← the witness matched here
     where created_at < now() - interval '90 days';   ← the number is here

The number was matched against the witness line alone. So the second bug would
have masked the first fix completely: the tool would have kept accusing the
project, with better evidence and the same wrong conclusion, and the natural
reading would have been *"the multi-repository fix did not help, so that was not
the problem."*

Both are now regression-tested — the 90-day promise is known answer 1, and
`test/scope.mjs` asserts that the same fixture promise is uncovered with one
root and covered with two.

### What else was cited as proof, and was not

Every one of these was a confident-looking verdict resting on nonsense. None
moved a single count, which is why none was caught by a count:

- **a vendored library.** `supabase-js-2.112.4.js`, 212 KB of somebody else's
  bundle, cited as proof that this project deletes user data. It proves the
  library can.
- **the translation file.** The project's i18n table holds the sentences stage one reads.
  Its string *"delete it after processing"* was offered as the witness for a
  deletion promise — the promise cited as its own evidence.
- **`classList.remove('is-clamped')`** as evidence that support tickets are
  deleted after ninety days. Hence strong and weak witnesses: a weak token only
  counts when the same line also shows a data context.
- **`REDIRECT_EXACT.put(...)`**, a HashMap insert in a dev server, as proof the
  site sends mail.
- **a comment.** A support module documented a 90-day retention period it did not
  implement. A comment naming the mechanism is the classic shape of a mechanism
  that is not there.

`test/evidence.mjs` now re-reads every citation from disk and checks that the
line exists and still says what the citation claims.

---

## Ten layers

Each catches something none of the others can.

<!-- svd:claim name=testLayers value=10 -->

| layer | what only it can catch |
|---|---|
| `npm run golden` | a change that leaves every count identical while shifting what each finding **is** |
| `npm run known-answers` | the three hand-traced answers silently dropping out of the contract |
| `npm run resilience` | a damaged input producing a quiet zero instead of a complaint |
| `npm run amplify` | output that does not depend on the input — a golden test passes on a hard-wired answer |
| `npm run lexicon` | a hole in one language-area cell, invisible in every total |
| `npm run negative` | a widening that gains a promise by also gaining a false one |
| `npm run scope` | an unstated scope printing as a finding — bug one, above |
| `npm run evidence` | a verdict whose citation is a comment, a bundle, or a line that does not exist |
| `npm run lang-check` | half a translation, which no fingerprint covers |
| `npm run readme` | this file drifting away from what it describes |

`npm test` runs all ten.

**On a fresh clone `npm test` exits 2, and that is not a failure.** The known
answers need two private repositories, so that layer reports SKIP and the runner
exits 2 to say "could not check" rather than 0 for "checked, fine" — the nine
other layers still pass and are self-contained. Point it at the material with
`SVD_WEB` and `SVD_APP` to get an exit of 0, and in CI treat 2 as a warning
rather than a break.

### The known answers

Three, traced by hand, kept as a contract in `test/known-answers.mjs`:

1. **the 90-day deletion promise is `covered`, by the second repository.**
   Not merely covered — the evidence must come from a `.sql` migration. Covered
   on the strength of website code would be right by accident.
2. **"never leaves your computer" is `elsewhere`, not `no-witness`.** The
   negative image of the first: there the tool must find what is there, here it
   must refuse to pronounce on what is not.
3. **a withdrawn "reply within a day" promise must NOT appear.** Removed from
   the site in a real commit. This is the only answer that checks the tool reads
   the **current** state — without it, a run against a stale build directory
   would look identical to a correct one.

Answer 3 carries its own liveness test. "Found nothing" is also what a broken
collector says, so the suite fails unless response promises are being collected
at all.

### The README gate

<!-- svd:claim name=fixture.promises value=17 -->
<!-- svd:claim name=fixture.sure value=12 -->
<!-- svd:claim name=fixture.edge value=5 -->
<!-- svd:claim name=fixture.covered value=8 -->

A tool that checks whether a project's sentences are backed by its code, and
cannot be pointed at its own documentation, has not understood its own premise.

Every number in this file is tagged in the Markdown and re-derived from the
running tool by `test/readme.mjs`. The fixture project in `test/fixtures/`
yields **17 promises — 12 `sure`, 5 `edge` — of which 8 are `covered`** when
both fixture roots are given. Every command shown above is executed. Every flag,
file and verdict named here must exist.

The prose is not checked; no test can tell whether an explanation is honest.
What is checked is that the numbers, commands, flags and file names are real —
and every documentation lie this project has told so far has been one of those.

---

## Limitations

- **It does not know whether the code it found is ever reached.** A `delete`
  behind an `if (false)` counts as a witness. The verdict is "something here
  does this", not "this happens".
- **`inspect` is not a verdict.** It is a reading list. For a negated promise
  that is the honest output at this stage.
- **The dictionary is a lexicon, not a grammar.** A commitment written with a
  verb nobody added is not found, and that shows up as a lower count — never as
  an error.
- **Language guessing returns null rather than a guess.** A sentence in an
  unrecognised language is counted as unknown and reported, not silently
  attributed to the wrong dictionary.
- **Two of the four languages have been exercised far harder than the others.**
  Polish and English carry the real project; German and Spanish are tested
  mostly on fixtures.

## Why it is built this way

The parser, the run snapshot, the diff between runs, the exclusion and mute
mechanism, the golden and resilience patterns are taken from
[odd-one-out](../odd-one-out) unchanged. The two tools differ in what they
**measure**, not in how they read a flag or write a run to disk, and a second
implementation of that layer would be a second place to fix.

MIT.
