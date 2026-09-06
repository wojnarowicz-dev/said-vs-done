// said-vs-done / done — stage two: is there anything in the code that keeps them.
//
// Takes the `sure` promises from stage one and looks for a witness in every
// repository it was given. What it will not do is answer a question it has no
// material for: see the scope banner below, and the long note in coverage.mjs
// about the run that reported a kept promise as broken because the code that
// keeps it lived in a repository nobody had named.

import { pathToFileURL } from 'node:url';
import { t } from './lang.mjs';
import { makeFlag, flagAll } from './args.mjs';
import { loadConfig } from './config.mjs';
import { findPromises } from './say.mjs';
import { indexCode, judge, VERDICTS } from './coverage.mjs';
import { noSourcesIn } from './population.mjs';

const argv = process.argv.slice(2);
const ROOT = argv[0];
const flag = makeFlag(argv);
const TOP = +flag('top', 40);
const AREA = flag('area', null);
const ONLY = flag('only', null);
const TIER = String(flag('tier', 'sure'));

const cfg = loadConfig(argv, ROOT);

/**
 * @param textRoot   where the promises are written
 * @param codeRoots  every repository that might implement them; empty means
 *                   none was given, and that is recorded rather than papered over
 */
// TIER DEFAULTS TO `sure`, AND IS NOT FIXED THERE. The default is the honest
// one: an edge promise has no named author, so a verdict about it says less.
// But the promise that made this tool worth building — "nagranie nie opuszcza
// Twojego komputera" — is an edge promise, written with the product as its
// subject, and refusing to judge it at all would leave the most important
// sentence on the site permanently unexamined. `--tier all` asks for both.
export function checkCoverage(textRoot, codeRoots, cfg, { tier = 'sure' } = {}) {
  const stage1 = findPromises(textRoot, cfg);
  const sure = tier === 'all' ? stage1.promises : stage1.promises.filter(p => p.tier === tier);
  const explicit = codeRoots.length > 0;
  const index = indexCode(explicit ? codeRoots : [textRoot], { explicit });
  return {
    stage1, sure, index, explicit,
    judged: sure.map(p => ({ promise: p, verdict: judge(p, index) })),
  };
}

export function toFindings(judged) {
  return judged.map(({ promise: p, verdict: v }) => ({
    rule: v.verdict,
    file: p.file,
    anchor: p.key || p.sentence.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 90),
    line: p.line,
    label: v.verdict.padEnd(11) + '[' + p.lang + '] ' + p.area + (p.negated ? '/NEG' : '') +
      '  ' + p.sentence.slice(0, 100),
    meta: {
      verdict: v.verdict, why: v.why, area: p.area, lang: p.lang,
      negated: p.negated, tier: p.tier, key: p.key,
      numbers: v.numbers || [], caveat: v.caveat || null,
      searched: v.searched || [],
      sentence: p.sentence,
      evidence: (v.evidence || []).slice(0, 3).map(e => e.file + ':' + e.line),
    },
  }));
}

// ---------------------------------------------------------------- run
// RUN ONLY WHEN THIS FILE IS THE ENTRY POINT. Hand-building the URL to
// compare against was wrong on Windows in two ways at once: the drive letter
// needs the third slash and every separator needs flipping. pathToFileURL
// does both, and `done.mjs` imports `say.mjs` — so getting this wrong runs
// stage one's whole report in the middle of stage two.
// The guard on argv[1] is not defensive noise: under `node -e` and under a
// test that imports this module there IS no entry script, and pathToFileURL
// throws on undefined. Importing a module must never be able to crash.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const codeRoots = flagAll(argv, 'code');
  const r = checkCoverage(ROOT, codeRoots, cfg, { tier: TIER });

  const missing = noSourcesIn(r.stage1.files, '.html/.js/.md', ROOT);
  if (missing) { console.log(missing); process.exit(0); }

  const { prepare, diffHeader, resultExit } = await import('./snapshot.mjs');

  let shown = r.judged;
  if (AREA && AREA !== true) shown = shown.filter(j => j.promise.area === AREA);
  if (ONLY && ONLY !== true) shown = shown.filter(j => j.verdict.verdict === ONLY);

  const counts = {};
  for (const v of VERDICTS) counts[v] = r.judged.filter(j => j.verdict.verdict === v).length;

  const w = prepare(argv, {
    detector: 'done', root: ROOT, args: argv.slice(1), cfg,
    counts: {
      ...counts,
      promisesSure: r.sure.length,
      codeFiles: r.index.files,
      codeRoots: r.index.roots.map(x => x.label),
      scopeStated: r.explicit,
    },
    findings: toFindings(shown),
  });

  console.log(t('doneTitle'));
  console.log(t('root') + ROOT);
  for (const root of r.index.roots) console.log(t('doneCodeRoot', root.root, root.files));
  console.log(t('doneCounts', r.sure.length, r.index.files));
  console.log('');

  // THE BANNER. Printed before the verdicts, not after, and printed even when
  // nothing came back `no-witness` — because the reader has to know the scope
  // of the run before reading a single line of it.
  if (!r.explicit) {
    console.error(t('doneNoScope1'));
    console.error(t('doneNoScope2'));
    console.error(t('doneNoScope3'));
    console.error(t('doneNoScope4'));
    console.log('');
  }

  console.log(t('doneVerdicts', VERDICTS.map(v => v + '=' + counts[v]).join('  ')));
  console.log(t('settings') + cfg.describe());
  diffHeader(w);
  console.log(t('doneVerdictHelp'));
  console.log('');

  for (const f of w.toShow.slice(0, TOP)) {
    console.log('  ' + f.label);
    console.log('        ' + f.file + ':' + f.line + (f.meta.key ? '  key=' + f.meta.key : '') +
      '  why=' + f.meta.why + (f.meta.numbers.length ? '  numbers=' + f.meta.numbers.join(',') : ''));
    for (const e of f.meta.evidence) console.log('        -> ' + e);
    if (f.meta.caveat) console.log(t('doneCaveat', f.meta.caveat));
  }
  if (w.toShow.length > TOP) console.log('  ... and ' + (w.toShow.length - TOP) + ' more');

  // EXIT CODE. 1 means there are promises the searched code does not keep —
  // `no-witness` only. `elsewhere` and `inspect` are questions, not answers,
  // and a build must not fail on a question.
  resultExit(counts['no-witness'] ? 1 : 0);
}
