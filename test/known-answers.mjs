// said-vs-done — the known-answer contract.
//
// THREE ANSWERS, TRACED BY HAND, AND THEY ARE THE REASON THIS TOOL EXISTS.
// Every one of them must still come out right after any change. Keeping the
// contract in prose guarantees that one day something quietly drops out of it;
// keeping it here means a change that loses an answer fails loudly.
//
//   1  90-day deletion    COVERED, and covered by the SECOND repository.
//                         The mechanism is purge_old_support_tickets() in the
//                         program's migrations while the sentence is on the
//                         website. This answer is the regression test for the
//                         worst bug this tool has had: it once reported the
//                         promise unkept because it had been shown one of the
//                         two repositories. An answer of `no-witness` here is
//                         not a lesser pass — it is that bug, returned.
//
//   2  "never leaves      ELSEWHERE, when only the website is searched.
//      your computer"     The desktop program is in neither repository, so
//                         nothing can settle it. This is the negative image of
//                         answer 1: there the tool must find what is there,
//                         here it must refuse to pronounce on what is not.
//                         `no-witness` would read as an accusation of lying.
//
//   3  reply within a     ABSENT. Removed from the site by commit 3adcb79.
//      day                It must NOT be collected today. This is the only
//                         answer that checks the tool looks at the CURRENT
//                         state; without it a run against a stale cache, an
//                         `out/` copy or a git object would look identical to
//                         a correct one.
//
// A missing answer exits 1. Material that cannot be reached exits 2 and says
// what to do — it is NEVER reported as a pass, because "nothing to check" and
// "everything checks out" must not look alike.
//
// MATERIAL lives in two private repositories. Paths are overridable:
//     SVD_WEB   VideoAnalyzerProWeb checkout
//     SVD_APP   VideoAudioAnalyzer checkout
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPromises } from '../src/say.mjs';
import { checkCoverage } from '../src/done.mjs';
import { loadConfig } from '../src/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// DEFAULTS ARE SIBLINGS OF THIS REPOSITORY, not absolute paths. An absolute
// path carries one machine's account name into a public repository and is wrong
// for everybody else anyway.
const NEXT_TO = path.join(HERE, '..', '..');
const WEB = process.env.SVD_WEB || path.join(NEXT_TO, 'VideoAnalyzerProWeb');
const APP = process.env.SVD_APP || path.join(NEXT_TO, 'VideoAudioAnalyzer');
const TEXT = path.join(WEB, 'main', 'src', 'web');

const exists = p => { try { return fs.existsSync(p); } catch { return false; } };

const results = [];
const record = (name, state, detail) => results.push({ name, state, detail });
const cfg = loadConfig([], TEXT);

console.log('said-vs-done — known answers\n');

// ---------------------------------------------------------------- 1 + 2
if (!exists(TEXT) || !exists(APP)) {
  const missing = [!exists(TEXT) && 'SVD_WEB -> ' + WEB, !exists(APP) && 'SVD_APP -> ' + APP]
    .filter(Boolean).join('; ');
  record('90-day deletion covered by the second repository', 'SKIP', missing);
  record('"never leaves your computer" is elsewhere, not unkept', 'SKIP', missing);
} else {
  const both = checkCoverage(TEXT, [WEB, APP], cfg);

  // ---- 1. the 90-day promise, in every language it is written in
  const ninety = both.judged.filter(({ promise: p }) =>
    p.area === 'deletion' && /\b90\b/.test(p.sentence) && !p.negated);

  if (ninety.length === 0) {
    record('90-day deletion covered by the second repository', 'FAIL',
      'stage one collected no 90-day deletion promise at all');
  } else {
    const bad = ninety.filter(j => j.verdict.verdict !== 'covered');
    const fromApp = ninety.filter(j =>
      (j.verdict.evidence || []).some(e => /\.sql/.test(e.file)));
    if (bad.length) {
      record('90-day deletion covered by the second repository', 'FAIL',
        bad.length + ' of ' + ninety.length + ' came back ' +
        [...new Set(bad.map(j => j.verdict.verdict))].join('/') +
        ' — e.g. "' + bad[0].promise.sentence.slice(0, 60) + '"');
    } else if (fromApp.length === 0) {
      // COVERED IS NOT ENOUGH ON ITS OWN. If the evidence came from the website
      // rather than the migrations, the verdict is right by accident and the
      // multi-root search is not what produced it.
      record('90-day deletion covered by the second repository', 'FAIL',
        'covered, but no evidence from a .sql migration — the second root did not supply it');
    } else {
      record('90-day deletion covered by the second repository', 'PASS',
        ninety.length + ' promises, ' + fromApp.length + ' cite a migration, e.g. ' +
        fromApp[0].verdict.evidence[0].file + ':' + fromApp[0].verdict.evidence[0].line);
    }
  }

  // ---- 2. the same run, website only: the local promise must not be judged
  //
  // TIER `all`, ON PURPOSE. "nagranie nie opuszcza Twojego komputera" puts the
  // PRODUCT in the subject position, so it is an edge promise and the default
  // `sure` run never reaches it. Asking only about the sure tier here made this
  // answer report SKIP — a test that quietly checks nothing, which is the exact
  // shape of failure the whole suite is built to refuse.
  const webOnly = checkCoverage(TEXT, [WEB], cfg, { tier: 'all' });
  const local = webOnly.judged.filter(({ promise: p }) =>
    p.area === 'transmission' && p.negated &&
    /(nie opuszcza|nie wychodz|never leaves|does not leave|verlässt|no sale de|zostaj[eą] na)/i.test(p.sentence));
  const accused = local.filter(j => j.verdict.verdict === 'no-witness');
  if (local.length === 0) {
    record('"never leaves your computer" is elsewhere, not unkept', 'FAIL',
      'the sentence was not collected at all — the answer cannot be checked, ' +
      'and an uncheckable answer is not a passing one');
  } else if (accused.length) {
    record('"never leaves your computer" is elsewhere, not unkept', 'FAIL',
      accused.length + ' negated transmission promise(s) called no-witness — ' +
      'the tool is accusing the text of lying about a program it cannot see');
  } else {
    record('"never leaves your computer" is elsewhere, not unkept', 'PASS',
      local.length + ' judged ' + [...new Set(local.map(j => j.verdict.verdict))].join('/'));
  }
}

// ---------------------------------------------------------------- 3
// THE NEGATIVE CONTROL, and it runs even when the program repository is
// missing, because it needs only the website.
if (!exists(TEXT)) {
  record('the withdrawn "reply within a day" promise is absent', 'SKIP', 'SVD_WEB -> ' + WEB);
} else {
  const stage1 = findPromises(TEXT, cfg);

  // Two independent tests, because one of them alone can pass for the wrong
  // reason: an area mislabelled would slip past the first, and a dictionary
  // that lost the response verbs entirely would slip past the second.
  const withTime = stage1.promises.filter(p =>
    p.area === 'response' && p.qualifiers.time.length);
  const wording = stage1.promises.filter(p =>
    /(w ciągu|within|innerhalb|binnen|en un plazo|24\s*(godz|hour|Stunden|horas)|dob[yaę])/i.test(p.sentence) &&
    /(odpowi|answer|repl|respond|antwort)/i.test(p.sentence));

  // AND A LIVENESS TEST. "Found nothing" is also what a broken collector says.
  // If no response promise is collected AT ALL, the absence above proves
  // nothing — so the suite refuses to call it a pass.
  const anyResponse = stage1.promises.filter(p => p.area === 'response');

  if (anyResponse.length === 0) {
    record('the withdrawn "reply within a day" promise is absent', 'FAIL',
      'no response promise of any kind was collected — the absence of the withdrawn ' +
      'one proves nothing, because nothing was found to begin with');
  } else if (withTime.length || wording.length) {
    const hit = (withTime[0] || wording[0]);
    record('the withdrawn "reply within a day" promise is absent', 'FAIL',
      'it is back: ' + hit.file + ':' + hit.line + '  "' + hit.sentence.slice(0, 70) + '"');
  } else {
    record('the withdrawn "reply within a day" promise is absent', 'PASS',
      anyResponse.length + ' response promises collected, none carries a deadline');
  }
}

// ---------------------------------------------------------------- report
for (const r of results)
  console.log('  ' + r.state.padEnd(6) + r.name.padEnd(54) + "  " + r.detail);

const failed = results.filter(r => r.state === 'FAIL');
const skipped = results.filter(r => r.state === 'SKIP');
console.log('\n  ' + results.filter(r => r.state === 'PASS').length + ' passed, ' +
  failed.length + ' failed' + (skipped.length ? ', ' + skipped.length + ' skipped' : ''));

if (failed.length) {
  console.log('\n  A known answer changed. These three are the contract; if the new behaviour');
  console.log('  is right, the answer here has to be rewritten deliberately, not quietly.');
  process.exit(1);
}
if (skipped.length) {
  console.log('\n  Some material was unreachable. "Could not check" is not "checked, fine",');
  console.log('  so this exits 2 rather than 0.');
  process.exit(2);
}
