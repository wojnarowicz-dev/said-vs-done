# said-vs-done

[![tests](https://github.com/wojnarowicz-dev/said-vs-done/actions/workflows/ci.yml/badge.svg)](https://github.com/wojnarowicz-dev/said-vs-done/actions/workflows/ci.yml)
[![known answers](https://img.shields.io/badge/known%20answers-0%20of%203%20checked%20in%20CI-lightgrey)](test/known-answers.mjs)

The grey badge beside the green one is what green does not cover: all three
known answers need two private checkouts, so CI runs them, finds no material,
and reports **exit 2 — neither a pass nor a failure**. Both numbers in that
badge are checked by `test/readme.mjs` against a real run.

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

<!-- svd:claim name=fixture.promises value=21 -->
<!-- svd:claim name=fixture.sure value=16 -->
<!-- svd:claim name=fixture.edge value=5 -->
<!-- svd:claim name=fixture.covered value=11 -->

A tool that checks whether a project's sentences are backed by its code, and
cannot be pointed at its own documentation, has not understood its own premise.

Every number in this file is tagged in the Markdown and re-derived from the
running tool by `test/readme.mjs`. The fixture project in `test/fixtures/`
yields **21 promises — 16 `sure`, 5 `edge` — of which 11 are `covered`** when
both fixture roots are given. Every command shown above is executed. Every flag,
file and verdict named here must exist.

The prose is not checked; no test can tell whether an explanation is honest.
What is checked is that the numbers, commands, flags and file names are real —
and every documentation lie this project has told so far has been one of those.

---

## Accuracy on other people's projects

Measured on three open-source projects, none of them mine, each holding a privacy
policy or terms inside the repository and the code that must keep it beside them:
Zulip, Matomo and Joplin. The criterion was written down before anything was
cloned — it is in `test/accuracy/criterion.md`, the material is pinned to a commit
in `test/accuracy/material.md`, and every row read in the code is in
`test/accuracy/results.md`.

**Two true defects out of thirteen findings read in the code.** Both are in
Joplin: a retention period documented as 99 days on the help page and as 100 days
in the privacy policy served to users, which the code implements as 93; and an API
document promising events are kept for 90 days where the code deletes them after
30. Zulip produced eight findings and not one was real. Matomo produced none.

    project   sentences read   sure promises   judgeable   findings   true
    zulip             17 254             231       82.7%          8      0
    matomo             2 080              17       58.8%          0      0
    joplin            24 363              74       82.4%          0      0

That is the default run. Where it returned nothing, the criterion required asking
whether the zero was earned, and `--tier all` was the way to ask: Matomo then gave
one finding, false; Joplin gave four, two of them the true defects above. Thirteen
rows read in the code, eleven of them false alarms.

`judgeable` is the share of first-person promises the tool reached any verdict on
at all — the share whose subject matter had machinery in the searched code. That
is the density this tool needs. Sentences read is not: a repository can hold
twenty thousand and offer nothing to check.

**The eleven false alarms have a single cause between them: the tool treats every
number in a promise as a quantity the code must honour.** A disk-size
recommendation, a count of call sites, two channel identifiers inside a URL, a
child's age, a fourteen-day notice period, the "(2)" of an enumeration, a GitHub
issue number, a year and an HTTP status code each became a promise the code was
failing to keep. Across every run of all three projects the tool produced 34
`no-witness` rows, and the reason on all 34 was that same one — no other reason
fired once. The rule that produced every false alarm also produced both true
defects, which is why it is still here and why it is the first thing to fix.
Twenty-one of Zulip's rows were not read one by one; the protocol was the first
ten per project, and Zulip's default run gave eight.

Six of the eleven were not addressed to a customer at all. Pointing the tool at a
whole repository feeds it developer documentation, changelogs and community
pages, and it has no notion that a sysadmin guide is not a promise.

### The two zeros

**Matomo's zero is earned by what was read and silent about what was not.** Its
PRIVACY.md is instructions to an administrator — "in this section we document how
to protect the privacy of visitors" — and there is nothing in it to break. But
Matomo's customer-facing copy is not in Markdown. It is 66 `lang/en.json` files,
5 590 strings, 5 058 sentences, holding five first-person promises including "We
will not share it with anyone else or use it for any other purpose." The collector
read .html, .js/.ts and .md at the time, so it never opened one of them. For a
project that keeps its copy in JSON this tool reported a confident nothing.
**It now reads .json**, and the two changes below are what that produced.

**Joplin's zero was the tool declining to look.** Its privacy policy is written
throughout with the product as the subject — "The Joplin applications do not send
any data", "Joplin saves geo-location information" — so every sentence lands in
the `edge` tier, and the default judges `sure` only. Both real defects found in
this whole exercise were sitting in that tier. The default is defensible, and it
hid the only true findings there were.

Both true rows also arrived with worthless evidence: the tool cited TinyMCE
language files and an eslint config as the places it had looked. The verdict was
right and the citation was not, and only the verdict is tested.


### What the measurement changed

Two things, and the measurement is the argument for both.

**The collector now reads .json.** Matomo's five promises were not a bad choice
of project; they were a file filter reported as an absence. A translation table
is where a product actually says what it does to a customer, and most products
keep theirs in JSON. The scanner is hand-written rather than `JSON.parse`, so
every promise still carries the line it came from.

**A number counts only when a unit of time is attached to it.** Re-run on the
same three repositories, the narrowed rule removed all eleven false alarms and
kept both true findings: Zulip's eight went to none, Matomo's one to none, and
Joplin's four to exactly the two real ones. Zulip at tier `all` fell from 29 rows
to five. The rule that produced every false alarm was also the only rule that
ever produced a true one, so it was narrowed rather than dropped, and what it can
no longer check is written down under Limitations rather than quietly lost.

---

### The third measurement, on new material after the changes

Same criterion, three projects that had nothing to do with the first three:
Outline, immich and bitwarden/clients. The default tier returned nothing on all
three, so each was raised as the criterion requires.

    project   promises   covered   no-witness   inspect   elsewhere
    outline         94        85            0         5           4
    immich         192       170            2         6          14
    clients        363       300           14        15          34

**Zero true defects out of sixteen rows read in the code.** No project keeps a
policy document any more — of the candidates probed, Mattermost's
`PRIVACY_POLICY.md` holds a URL, BookWyrm's renders a database field and
Synapse's template reads "All your base are belong to us" — so the material rule
was widened to client-facing copy, which is what the .json change had just made
readable. It worked: every row below came out of a translation table that the
previous version could not open.

The sixteen rows are four distinct promises, and they name two more faults.

**The venue test is too coarse, and it is the original bug in a new disguise.**
Fourteen rows are Bitwarden's "Items you delete will appear here and be
permanently deleted after 30 days" and "Unclaimed domains are removed after 7
days". Both are server-side retention periods, and Bitwarden's server is a
different repository: `bitwarden/clients` has no scheduled jobs at all. The
right verdict is `elsewhere`. The tool said `no-witness`, because the venue test
asks "does this repository contain deletion machinery" — and it does, it deletes
ciphers and clears local storage — where the question that matters is "does it
contain the machinery for THIS deletion". `--code` fixed naming the right
repository. Naming the right repository for a given promise is not fixed.

**One promise is many findings.** Those fourteen rows are two promises. A
promise's identity includes its language, so a commitment translated into thirty
languages is thirty findings, and a trailing full stop makes another. "The first
ten findings" on Bitwarden means ten translations of one sentence.

immich's two rows are one sentence counted under two areas, and the sentence
describes Apple Photos: "They will be in Recently Deleted for 30 days." immich
neither implements that nor could.

Outline's zero is earned, and was checked rather than assumed: the only
duration-bearing sentence in its copy is "This link will expire in 24 hours",
and the expiry machinery is in the same repository. Outline does have 60-day and
90-day permanent deleters in `server/commands`, but no sentence tells a customer
about them, so there is nothing to check and nothing is the right answer.

**Across three measurements: two true defects in twenty-nine rows read in the
code.** Both were Joplin's, both were documentation drift on a retention period,
and both were found by the same rule that produced every false alarm.

---



## Limitations

- **A promise translated is a promise counted again, and that inflates every
  number in this file.** Language is part of a promise's identity, so one
  commitment shipped in thirty locales is thirty promises, and when it is unkept
  it is thirty findings. Every count in the measurements above — promises,
  `covered`, `no-witness` — counts rows rather than distinct commitments, and
  the distance between the two is however many languages the project ships.
  Fourteen of the third measurement's sixteen rows were two sentences. Nothing
  in the tool collapses them, and no number it prints should be read as a count
  of things a maintainer would have to fix.
- **The venue test knows the repository, not the promise.** It asks whether this
  repository contains deletion machinery, not whether it contains the machinery
  for THIS deletion. A client repository whose server lives elsewhere therefore
  gets `no-witness` where `elsewhere` is right — fourteen rows of the third
  measurement, and the same failure `--code` was added to prevent, one level
  further down.
- **Only durations are checked against the code.** A number counts as a quantity
  the code must honour when a unit of time is attached to it, because that is
  the only kind of quantity a witness can be asked about. "We keep at most three
  backups" is therefore not checked, and comes back `covered` on the strength of
  the backup routine alone.
- **It reads .html, .js/.ts, .md and .json, and nothing else.** A project that
  keeps its customer-facing copy in .yml or .po translation files, or in server
  templates like .erb or .blade.php, still gets a confident zero.
- **The default tier judges `sure` only, and impersonal policies are common.**
  Joplin's entire privacy policy has the product as its subject, so the default
  run had nothing to say about it. `--tier all` reaches those sentences.
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
