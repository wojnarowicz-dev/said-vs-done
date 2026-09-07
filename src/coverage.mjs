// said-vs-done — stage two: is there anything in the code that keeps the promise?
//
// Stage one found the sentences. This decides, for each one, whether the
// repository contains something that could make it true — and, just as often,
// says that it cannot tell from here.
//
// ---------------------------------------------------------------- THREE VERDICTS
//
// The obvious design has two — kept or broken — and it is wrong, in the way
// that matters most. Point this at a website repository and the promise "the
// recording never leaves your computer" has NO code in the repository that
// could confirm or deny it: the desktop program lives somewhere else entirely,
// and what is here is a website. A two-state tool answers UNCOVERED, which
// reads as an accusation that the sentence is a lie. It is not; the tool simply
// cannot see the program.
//
//   covered     a witness was found: the code does the thing, and where the
//               promise carries a number the number is there too
//   no-witness  the machinery this promise lives in IS in this repository, and
//               nothing in it keeps the promise            <-- the finding
//   elsewhere   the machinery is not in this repository at all; nothing here
//               can settle it
//   inspect     a negated promise ("nothing is sent") with counter-witnesses
//               present: the sites that could break it, listed for a human
//
// `elsewhere` and `no-witness` must never be printed as the same thing. This is
// the same rule odd-one-out enforces with its "no sources found" state: a run
// that returns nothing because it had nothing to read must not look like a run
// that returned nothing because everything was fine.
//
// ---------------------------------------------------------------- WHAT A NEGATION DOES
//
// It inverts the whole question, which is why stage one had to record it.
//
//   "usuwamy zgloszenia"     kept when a delete EXISTS      -> look for a witness
//   "nie wysylamy nagran"    kept when a send does NOT      -> look for violations
//
// A tool that ignored the sign would go looking for a sending routine to prove
// "we never send", find one (every site has a fetch somewhere), and call the
// promise kept. That is worse than no answer.
//
// A negated promise is therefore never reported as `covered` on the strength of
// absence alone. Absence of evidence in a repository that holds a third of the
// system is not evidence. What it gets instead is `inspect` plus the list of
// every place that transmits anything, because that list is short and a person
// can read it — which is the honest deliverable at this stage.
//
// ---------------------------------------------------------------- NO PARSING HERE
//
// Deliberately regular expressions over source text, not a syntax tree. The
// witness for a deletion promise is `.delete(`, `DELETE FROM`, `unlink`, a cron
// entry, a retention constant — and those live in four languages and in SQL
// embedded in strings. A tree would parse one of them properly and lose the
// rest. When this grows into "is the delete actually reached", it will need a
// tree; today it needs breadth.

import fs from 'node:fs';
import path from 'node:path';
import { quantities } from './promise.mjs';

// ---------------------------------------------------------------- what counts as code
//
// THREE KINDS OF FILE THAT ARE NOT THIS PROJECT'S CODE, and all three produced
// false evidence on the first run:
//
//   a vendored library   `supabase-js-2.112.4.js` is 212 KB of somebody else's
//                        bundle. It matches every pattern in the table, so the
//                        first run cited it as proof that this project deletes
//                        user data. It proves the library can delete; it says
//                        nothing about whether this project ever calls it.
//   a translation table  an i18n file holds the very sentences stage one
//                        reads. Its string "delete it after processing" was
//                        offered as the witness for a deletion promise — the
//                        promise being cited as its own evidence. Circular, and
//                        it would mark every promise kept by restating it.
//   a build artefact     already covered by SKIP, kept here for the same reason.
//
// The version-number test catches the first without a list of library names to
// maintain; the long-line test catches minified bundles whatever they are
// called, since `.min.` in the name is a convention and not a rule.
const CODE = /\.(js|mjs|cjs|ts|mts|java|sql|py|rb|go|rs|php|kt|cs)$/i;
const SKIP = /[\\/](node_modules|\.git|out|dist|build|coverage|main_extracted|vendor|third[-_]party)[\\/]/i;
const VENDORED = /(\.min\.|\.bundle\.|-\d+\.\d+\.\d+|\bjquery|\bbootstrap|\breact-dom)/i;
const TRANSLATION = /(i18n|l10n|locale|messages|translations?|lang[-_.])/i;
const BUNDLE_LINE = 2000;   // a line this long is generated, not written

// ---------------------------------------------------------------- the witness table
//
// Per area, three kinds of pattern. They are deliberately generous: a witness
// that names the wrong function still points a reader at the right file, while
// a witness that is too strict returns `no-witness` on a promise that is kept,
// which is the failure that costs trust.
//
//   venue      does this repository contain the KIND of machinery this promise
//              lives in? Without a match the verdict is `elsewhere`, and no
//              amount of missing witnesses can turn that into an accusation.
//   witness    the promise is affirmative and this shows it is kept
//   violation  the promise is negated and this shows what could break it
//
// STRONG AND WEAK WITNESSES. `delete` and `remove` are the two most common
// words in a browser codebase and almost none of their uses touch a customer's
// data: `classList.remove`, `removeChild`, `removeEventListener`. The first run
// cited `textEl.classList.remove('is-clamped')` as evidence that support
// tickets are deleted after ninety days.
//
// So a weak token only counts as a witness when the SAME LINE also shows a data
// context — a table, a query, a store. A strong token (`DELETE FROM`, `unlink`,
// `pg_cron`) needs no such help, because it has no innocent reading.
const DATA_CONTEXT = /\b(supabase|\.rpc\(|\.from\(|table|query|sql|db\b|database|row|record|localStorage|sessionStorage|indexedDB|storage|ticket|account|user|subscription|review|session|file|dir|path)\b/i;

export const WITNESSES = {
  deletion: {
    // SQL ON ITS OWN IS A VENUE. The first table demanded a client library —
    // supabase, prisma, knex — so a repository whose data layer is plain
    // migrations counted as having no venue at all, and every deletion promise
    // came back `elsewhere`: the tool politely declined to judge the one place
    // that actually does the deleting. A `delete from` is not evidence that a
    // library is present; it is evidence that a data store is.
    venue: /\b(supabase|createClient|\.rpc\(|\.from\(|prisma|knex|mongoose|sequelize|CREATE\s+TABLE|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|pg_cron|localStorage|indexedDB|fs\.(unlink|rm)|File\.delete)\b/i,
    witness: /\b(purge|erase|wipe|unlink|rmSync|rmdir|truncate|DELETE\s+FROM|DROP\s+TABLE|\.delete\(\)|removeItem|on\s+delete\s+cascade|retention|expires?_?at|ttl|pg_cron|cron\.schedule)\b/i,
    weak: /\b(delete|destroy|remove|drop|expire|cleanup|prune)\b/i,
    violation: null,
  },
  transmission: {
    venue: /\b(fetch\(|XMLHttpRequest|sendBeacon|WebSocket|axios|got\(|request\(|HttpClient|HttpURLConnection|curl_|urllib|net\/http)\b/i,
    // `put(` and `post(` unqualified matched `REDIRECT_EXACT.put(pola[0], …)`,
    // a HashMap insert in a local dev server, and offered it as proof that the
    // site sends mail. A witness has to name the transport, not a method whose
    // name is shared with every collection class in Java.
    witness: /\b(fetch\(|sendBeacon|\.send\(|\.post\(|method:\s*['"]POST|upload|FormData|smtp|sendMail|nodemailer|resend|sendgrid|mailgun|postmark|resetPasswordForEmail|signInWithOtp)\b/i,
    // For "nothing is ever sent": every outbound call is a place to check.
    violation: /\b(fetch\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|axios\.|\.upload\(|FormData\b|multipart\/form-data)/i,
  },
  storage: {
    venue: /\b(supabase|\.rpc\(|\.from\(|localStorage|sessionStorage|indexedDB|INSERT\s+INTO|CREATE\s+TABLE|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|prisma|writeFile|fs\.write)\b/i,
    witness: /\b(upsert|setItem|writeFileSync|writeFile|INSERT\s+INTO|UPDATE\s+\w+\s+SET|localStorage\.set|sessionStorage\.set)\b/i,
    weak: /\b(insert|update|save|store|persist|cache|\.put\()\b/i,
    violation: /\b(upsert|setItem|writeFile|INSERT\s+INTO|localStorage\.set|sessionStorage\.set)\b/i,
  },
  encryption: {
    venue: /\b(crypto|bcrypt|argon2|scrypt|pbkdf2|createHash|createCipher|subtle|DPAPI|ProtectedData|libsodium|openssl|tls|https:)\b/i,
    witness: /\b(createHash|createCipheriv|encrypt|bcrypt|argon2|scrypt|pbkdf2|sha256|sha512|subtle\.(encrypt|digest)|DPAPI|ProtectedData|TLS|https:)\b/i,
    violation: null,
  },
  sharing: {
    venue: /\b(fetch\(|analytics|gtag|dataLayer|facebook|pixel|thirdParty|partner|affiliate|\.rpc\(|webhook)\b/i,
    witness: /\b(share|publish|export|webhook|forward|relay|syndicate)\b/i,
    // "we never pass your data on" — anything that ships data outward.
    violation: /\b(gtag\(|dataLayer|analytics|fbq\(|pixel|hotjar|clarity|segment\.|mixpanel|amplitude|thirdParty|partner_?api)\b/i,
  },
  response: {
    // Answering a customer needs a way to reach them. If nothing in the
    // repository can send mail or open a ticket, the promise is kept somewhere
    // this tool cannot see — an inbox, not a codebase.
    venue: /\b(sendMail|nodemailer|smtp|resend|sendgrid|mailgun|postmark|ses\b|mailto:|support|ticket|inbox|zendesk|intercom|helpscout)\b/i,
    witness: /\b(sendMail|nodemailer|smtp|resend\.|sendgrid|mailgun|postmark|mailto:|ticket|support_?ticket|notify|reply|respond)\b/i,
    violation: null,
  },
  payment: {
    venue: /\b(stripe|paypal|braintree|adyen|payu|przelewy24|checkout|invoice|subscription|billing)\b/i,
    witness: /\b(refund|reimburse|credit_?note|cancel(?:_|ation)|stripe\.\w+\.(?:refunds?|cancel)|charges?\.create|invoice)\b/i,
    violation: null,
  },
  access: {
    venue: /\b(subscription|entitle|licen[cs]e|unlock|paywall|has_active|role|claim|jwt|token|auth)\b/i,
    witness: /\b(unlock|enable|activate|grant|has_active_subscription|entitle|isPaid|is_?premium|allow|permit|feature_?flag)\b/i,
    violation: null,
  },
  guarantee: {
    // Nothing in a codebase "implements" a guarantee. What can be checked is
    // whether the thing being guaranteed has an implementation, and that is the
    // job of whichever area the guarantee is about — so this one is always
    // referred out rather than answered.
    venue: null,
    witness: null,
    violation: null,
  },
};

// ---------------------------------------------------------------- index
/**
 * Reads every code file once and records where each pattern hits.
 *
 * ONE PASS, NOT ONE PER PROMISE. Seventy-eight promises times three patterns
 * times a hundred files is twenty-three thousand file reads; the index makes it
 * a hundred. It matters less for speed than for the report: hits are collected
 * with their file and line so a verdict can name its evidence, and a verdict
 * that cannot name its evidence is not worth printing.
 */
const HITS_PER_FILE = 20;

/**
 * @param roots     one path, or several. SEVERAL IS THE NORMAL CASE.
 * @param explicit  were these roots named by the caller (`--code`), or defaulted
 *                  to the directory the promises came from? The answer changes
 *                  what a missing witness is allowed to mean, so it travels with
 *                  the index rather than being re-derived by whoever reports.
 */
export function indexCode(roots, { explicit = false } = {}) {
  const list = (Array.isArray(roots) ? roots : [roots]).filter(Boolean);
  const skipped = [];
  const perRoot = [];

  const hits = {};                       // area -> { venue:[], witness:[], violation:[] }
  for (const area of Object.keys(WITNESSES)) hits[area] = { venue: [], witness: [], violation: [] };

  for (const root of list) {
    const files = [];
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (SKIP.test(p + path.sep)) continue;
        if (e.isDirectory()) { walk(p); continue; }
        if (!CODE.test(e.name)) continue;
        if (VENDORED.test(e.name)) { skipped.push({ file: p, why: 'vendored' }); continue; }
        if (TRANSLATION.test(e.name)) { skipped.push({ file: p, why: 'translations' }); continue; }
        files.push(p);
      }
    };
    walk(root);

    const label = path.basename(path.resolve(root));
    let kept = 0;
    for (const f of files) {
      let src;
      try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
      const lines = src.split(/\r?\n/);
      if (lines.some(l => l.length > BUNDLE_LINE)) { skipped.push({ file: f, why: 'bundle' }); continue; }
      kept++;
      // The root is named in the path, because with several roots in play
      // "supabase/migrations/…" alone does not say WHICH repository.
      const rel = label + '/' + path.relative(root, f).replace(/\\/g, '/');

      for (const [area, spec] of Object.entries(WITNESSES)) {
        for (const kind of ['venue', 'witness', 'violation']) {
          const re = spec[kind];
          if (!re) continue;
          let found = 0;
          for (let i = 0; i < lines.length && found < HITS_PER_FILE; i++) {
            const line = lines[i];
            // COMMENTS ARE NOT EVIDENCE. A support module documented a "90-day
            // retention period" in its header comment and implements none of
            // it; counting that line as a witness would have marked the
            // deletion promise kept on the strength of a sentence describing
            // the very gap this tool exists to find. A comment mentioning the
            // mechanism is the classic shape of a mechanism that is not there.
            if (/^\s*(\/\/|\*|\/\*|#|--)/.test(line)) continue;

            const strong = re.test(line);
            const weak = !strong && kind === 'witness' && spec.weak &&
              spec.weak.test(line) && DATA_CONTEXT.test(line);
            if (!strong && !weak) continue;

            hits[area][kind].push({
              root: label, file: rel, line: i + 1,
              text: line.trim().slice(0, 160),
              // THE NUMBER IS RARELY ON THE VERB'S LINE. A statement is written
              // across lines, and the one that deletes and the one that says
              // how old is too old are neighbours, not the same line:
              //     delete from public.reports
              //      where created_at < now() - interval '90 days';
              // Matching the number against the witness line alone missed the
              // real mechanism and reported the promise unkept — which is the
              // false alarm this whole revision exists to remove.
              context: lines.slice(i, i + 3).join(' ').slice(0, 300),
              strength: strong ? 'strong' : 'weak',
            });
            found++;
          }
        }
      }
    }
    perRoot.push({ root: path.resolve(root), label, files: kept });
  }

  return {
    roots: perRoot,
    explicit,
    files: perRoot.reduce((n, r) => n + r.files, 0),
    skipped,
    hits,
  };
}

// ---------------------------------------------------------------- numbers
//
// A promise carrying a number is the only kind that can be checked closely:
// "deleted after 90 days" is kept by code that knows about 90, and a delete
// with no interval is a different promise. The numbers come out of the sentence
// itself, which is why stage one kept the qualifier text instead of a boolean.
//
// IT USED TO BE EVERY NUMBER IN THE SENTENCE, and that single line produced all
// eleven false alarms the accuracy measurement turned up — see `quantities` in
// promise.mjs for the list and the reasoning. It also produced both true
// findings, which is why the rule was narrowed rather than removed.
function numbersIn(promise) {
  return quantities(promise.sentence, promise.lang);
}

function numberWitness(index, area, numbers) {
  if (!numbers.length) return null;
  const re = new RegExp('\\b(' + numbers.join('|') + ')\\b');
  return index.hits[area].witness.find(h => re.test(h.context || h.text)) || null;
}

// ---------------------------------------------------------------- the judgement
/**
 * @param promise  a `sure` promise from stage one: { area, negated, sentence, qualifiers }
 * @param index    the result of indexCode()
 * @returns { verdict, why, evidence[], numbers[] }
 */
// A VERDICT IS ONLY AS WIDE AS WHAT WAS SEARCHED, and this is the correction
// that matters most in this file.
//
// The first run reported "the site promises deletion after 90 days and nothing
// in the code deletes". It was wrong. The mechanism existed the whole time —
// `purge_old_reports()`, `delete from reports where created_at < now() -
// interval '90 days'` — in the migrations of the PROGRAM repository,
// while the run had been pointed at the WEBSITE repository. Split a project
// across two repositories and every promise the site makes but the database
// keeps comes back as a lie.
//
// The failure was not the search. It was that a result which meant "I had no
// material" was printed in the words of "I checked and it is not there". That
// is precisely the class of defect this tool exists to find, produced by the
// tool itself, and it is why `no-witness` now carries where it looked.
//
// So: an unstated scope is not a finding. When the caller named no code roots,
// the roots defaulted to wherever the sentences were read from — a guess, and
// in a two-repository project the wrong one. Every `no-witness` from such a run
// is marked `scopeUnset`, and a report that ignores the mark is a report that
// repeats the false alarm.
function caveat(index) {
  return index.explicit ? null : 'scopeUnset';
}

export function judge(promise, index) {
  const spec = WITNESSES[promise.area];
  const hits = index.hits[promise.area];

  // An area with nothing to look for is referred out rather than guessed at.
  if (!spec || !spec.venue) {
    return { verdict: 'elsewhere', why: 'noVenueDefined', evidence: [], numbers: [] };
  }

  if (hits.venue.length === 0) {
    return { verdict: 'elsewhere', why: 'noVenueInRepo', evidence: [], numbers: [], caveat: caveat(index), searched: index.roots.map(r => r.label) };
  }

  // ---- negated: absence proves nothing, so list what could break it
  if (promise.negated) {
    if (!spec.violation) {
      return { verdict: 'elsewhere', why: 'noViolationPattern', evidence: [], numbers: [] };
    }
    return {
      verdict: 'inspect',
      why: hits.violation.length ? 'counterWitnesses' : 'noCounterWitness',
      evidence: hits.violation.slice(0, 8),
      numbers: [],
    };
  }

  // ---- affirmative: something must do the thing
  if (hits.witness.length === 0) {
    return { verdict: 'no-witness', why: 'venueButNothingDoesIt', evidence: hits.venue.slice(0, 4), numbers: [], caveat: caveat(index), searched: index.roots.map(r => r.label) };
  }

  const numbers = numbersIn(promise);
  if (numbers.length) {
    const withNumber = numberWitness(index, promise.area, numbers);
    if (!withNumber) {
      // THE PARTIAL CASE, AND THE ONE THE TOOL WAS BUILT FOR. There is a delete
      // in the code and the sentence promises a delete AFTER NINETY DAYS. The
      // delete that exists is the one the customer triggers by hand; nothing
      // knows about ninety. Reporting this as `covered` because a delete exists
      // is exactly the first real defect — a deletion aimed at the wrong thing,
      // reported as a deletion.
      return {
        verdict: 'no-witness', why: 'witnessWithoutTheNumber',
        evidence: hits.witness.slice(0, 6), numbers,
        caveat: caveat(index), searched: index.roots.map(r => r.label),
      };
    }
    return { verdict: 'covered', why: 'witnessWithTheNumber', evidence: [withNumber], numbers, caveat: null, searched: index.roots.map(r => r.label) };
  }

  return { verdict: 'covered', why: 'witness', evidence: hits.witness.slice(0, 3), numbers: [], caveat: null, searched: index.roots.map(r => r.label) };
}

export const VERDICTS = ['covered', 'no-witness', 'inspect', 'elsewhere'];
