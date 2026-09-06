// said-vs-done — layer 8: every citation must be real.
//
// WHY. A verdict is only worth what its evidence is worth, and the first
// working version cited, in order: a vendored 212 KB library bundle, the
// translation file holding the promise's own text, `classList.remove` on a CSS
// class, and a HashMap `.put()` in a dev server. Every one of those verdicts
// read as a confident conclusion.
//
// None of them was caught by a count. The verdict distribution was identical
// before and after they were removed, because the same promises kept the same
// verdicts — only the reasons were nonsense. So this layer checks the reasons.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { indexCode } from '../src/coverage.mjs';
import { checkCoverage } from '../src/done.mjs';
import { loadConfig } from '../src/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, 'fixtures', 'site');
const APP = path.join(HERE, 'fixtures', 'app');
const CONFIG = path.join(HERE, 'fixtures', 'golden.config.json');
const cfg = loadConfig(['--config', CONFIG], SITE);

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + name.padEnd(50) + (detail || ''));
};

console.log('said-vs-done — evidence\n');

const index = indexCode([SITE, APP], { explicit: true });
const roots = { site: SITE, app: APP };
const allHits = Object.values(index.hits).flatMap(h => [...h.venue, ...h.witness, ...h.violation]);

// ---- 1. every cited line exists, and says what the citation says it says
let unreal = [];
for (const h of allHits) {
  const rest = h.file.split('/').slice(1).join('/');
  const abs = path.join(roots[h.root] || '', rest);
  let lines;
  try { lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/); } catch { unreal.push(h.file + ' (unreadable)'); continue; }
  if (h.line < 1 || h.line > lines.length) { unreal.push(h.file + ':' + h.line + ' (past end of file)'); continue; }
  if (lines[h.line - 1].trim().slice(0, 160) !== h.text) unreal.push(h.file + ':' + h.line + ' (text does not match the line)');
}
check('every cited file:line exists and matches', unreal.length === 0,
  unreal.length ? unreal.slice(0, 3).join('; ') : allHits.length + ' citations verified');

// ---- 2. nothing is cited from a comment
//
// A support module's header comment described a 90-day retention period it
// does not implement. A comment naming the mechanism is the classic shape of a
// mechanism that is not there, so it must never be evidence that it is.
const fromComment = allHits.filter(h => /^\s*(\/\/|\*|\/\*|#|--)/.test(h.text));
check('nothing is cited from a comment', fromComment.length === 0,
  fromComment.length ? fromComment[0].file + ':' + fromComment[0].line : 'none of ' + allHits.length);

// ---- 3. nothing is cited from a vendored bundle or a translation table
const badFile = allHits.filter(h => /(\.min\.|\.bundle\.|-\d+\.\d+\.\d+|i18n|locale|messages|translations?)/i.test(h.file));
check('nothing is cited from a bundle or a translation table', badFile.length === 0,
  badFile.length ? badFile[0].file : 'none of ' + allHits.length);

// ---- 4. a covered verdict always names its evidence
//
// "covered" with an empty evidence list is an assertion, not a finding.
const { judged } = checkCoverage(SITE, [SITE, APP], cfg);
const covered = judged.filter(j => j.verdict.verdict === 'covered');
const bare = covered.filter(j => !(j.verdict.evidence || []).length);
check('every covered verdict names its evidence', bare.length === 0,
  bare.length ? bare[0].promise.sentence.slice(0, 50) : covered.length + ' covered, all cited');

// ---- 5. a number promise is only covered by a witness that knows the number
const numbered = covered.filter(j => (j.verdict.numbers || []).length);
const wrong = numbered.filter(j => {
  // The boundary is a lookaround over digits, not a word-boundary escape.
  // Three files here have now lost a backslash passing through a shell
  // heredoc, and a collapsed escape becomes a control character that matches
  // nothing — a test that quietly stops testing, which is the one outcome
  // this suite exists to make impossible.
  const re = new RegExp('(?<![0-9])(' + j.verdict.numbers.join('|') + ')(?![0-9])');
  return !j.verdict.evidence.some(e => re.test(e.context || e.text));
});
check('a numbered promise cites a witness with that number', wrong.length === 0,
  wrong.length ? wrong[0].promise.sentence.slice(0, 50) : numbered.length + ' numbered, all matched');

// ---- 6. the index reports what it refused to read
check('the index records what it skipped and why', Array.isArray(index.skipped),
  index.skipped.length + ' file(s) skipped');

console.log('\n  ' + (failed ? failed + ' failed' : 'all evidence checks passed'));
if (failed) {
  console.log('\n  A verdict whose reason is nonsense is worse than no verdict: it is believed.');
  process.exit(1);
}
