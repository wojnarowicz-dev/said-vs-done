// said-vs-done / say — stage one: the promises, and nothing about the code.
//
// Reads client-facing text and reports every sentence that commits somebody to
// an act. It does NOT look at the code; `done` does that. The split is not
// tidiness — stage one has to be usable on its own, because the first question
// about a project is "how much am I promising", and that is answerable before
// any repository has been named.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { t } from './lang.mjs';
import { makeFlag } from './args.mjs';
import { reportNonUtf8 } from './input.mjs';
import { loadConfig } from './config.mjs';
import { collect, sentenceRows, unreadableFiles } from './collect.mjs';
import { recognise, lexiconSize } from './promise.mjs';
import { noSourcesIn } from './population.mjs';

const argv = process.argv.slice(2);
const ROOT = argv[0];
const flag = makeFlag(argv);
const TOP = +flag('top', 40);
const TIER = String(flag('tier', 'all'));
const AREA = flag('area', null);

const cfg = loadConfig(argv, ROOT);

/** Everything stage one knows, as data. `done` and the tests both call this. */
export function findPromises(root, cfg) {
  const collected = collect(root, cfg);
  const { rows, unknown } = sentenceRows(collected);

  const found = [];
  for (const r of rows)
    for (const h of recognise(r.sentence, r.lang))
      found.push({ ...r, ...h });

  // ONE SENTENCE, MANY PAGES, ONE PROMISE. A site repeats its navigation and
  // its meta description on every page; counting occurrences would say this
  // project makes five hundred promises when it makes a few hundred. The
  // occurrences are kept as a number, because "said on 40 pages" is worth
  // knowing when the promise turns out to be unkept.
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const distinct = new Map();
  for (const p of found) {
    const k = [p.lang, p.area, p.form, norm(p.sentence)].join('|');
    if (!distinct.has(k)) distinct.set(k, { ...p, occurrences: 0, files: [] });
    const d = distinct.get(k);
    d.occurrences++;
    if (!d.files.includes(p.file)) d.files.push(p.file);
  }

  return {
    root,
    files: collected.files,
    sentences: rows.length,
    unknown,
    promises: [...distinct.values()].sort((a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line),
  };
}

/** Snapshot shape, shared with `done` so a diff can compare like with like. */
export function toFindings(promises) {
  return promises.map(p => ({
    rule: p.area,
    file: p.file,
    // THE ANCHOR IS THE KEY WHERE THERE IS ONE. An i18n key is the project's
    // own stable name for a sentence and survives every rewording; without one
    // the normalised sentence has to do, and a reworded sentence then reads as
    // one promise gone and one arrived. That is the honest outcome: reworded
    // copy IS a different promise until somebody says otherwise.
    anchor: p.key || p.sentence.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 90),
    line: p.line,
    label: '[' + p.lang + '] ' + p.area + '/' + p.form + (p.negated ? '/NEG' : '') +
      '  ' + p.sentence.slice(0, 110),
    meta: {
      lang: p.lang, area: p.area, form: p.form, tier: p.tier,
      negated: p.negated, match: p.match, where: p.where,
      key: p.key, occurrences: p.occurrences,
      sentence: p.sentence,
      time: p.qualifiers.time, totality: p.qualifiers.totality,
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
  const result = findPromises(ROOT, cfg);

  const missing = noSourcesIn(result.files, '.html/.js/.md', ROOT);
  if (missing) { console.log(missing); process.exit(0); }

  let shown = result.promises;
  if (TIER !== 'all') shown = shown.filter(p => p.tier === TIER);
  if (AREA && AREA !== true) shown = shown.filter(p => p.area === AREA);

  const { prepare, diffHeader, resultExit } = await import('./snapshot.mjs');
  const sure = result.promises.filter(p => p.tier === 'sure');
  const edge = result.promises.filter(p => p.tier === 'edge');

  const w = prepare(argv, {
    detector: 'say', root: ROOT, args: argv.slice(1), cfg,
    counts: {
      files: result.files, sentences: result.sentences, unknownLanguage: result.unknown,
      promises: result.promises.length, sure: sure.length, edge: edge.length,
    },
    findings: toFindings(shown),
  });

  const lex = lexiconSize();
  const tally = (rows, key) => {
    const m = new Map();
    for (const r of rows) m.set(r.meta ? r.meta[key] : r[key], (m.get(r.meta ? r.meta[key] : r[key]) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join('  ');
  };

  console.log(t('sayTitle'));
  console.log(t('root') + ROOT);
  console.log(t('sayLexicon', lex.pl, lex.en, lex.de, lex.es, lex.edge));
  console.log(t('sayStats', result.files, result.sentences, result.unknown));
  console.log(t('sayCounts', result.promises.length, sure.length, edge.length));
  console.log(t('sayByLang', tally(result.promises, 'lang')));
  console.log(t('sayByArea', tally(result.promises, 'area')));
  console.log(t('sayByForm', tally(result.promises, 'form')));
  console.log(t('settings') + cfg.describe());
  diffHeader(w);
  console.log(t('sayTierHint'));
  console.log('');

  for (const f of w.toShow.slice(0, TOP)) {
    console.log('  ' + f.meta.tier.padEnd(5) + f.label);
    console.log('        ' + f.file + ':' + f.line + (f.meta.key ? '  key=' + f.meta.key : '') +
      (f.meta.occurrences > 1 ? '  x' + f.meta.occurrences : '') +
      (f.meta.time.length ? '  time=' + f.meta.time.join(',') : '') +
      (f.meta.totality.length ? '  all=' + f.meta.totality.join(',') : ''));
  }
  if (w.toShow.length > TOP) console.log('  ... and ' + (w.toShow.length - TOP) + ' more');

  // SAID LAST, so it is the line left on screen rather than something scrolled
  // past. Both of these subtract from the totals printed above, and a total
  // that is quietly short is the failure this whole tool is about.
  const skipped = unreadableFiles();
  if (skipped.length) {
    console.log('');
    console.log(t('unreadableFiles', skipped.length,
      skipped.slice(0, 5).map(u => u.rel + ' (' + u.code + ')').join(', ') +
      (skipped.length > 5 ? ', ...' : '')));
    console.log(t('unreadableHint'));
  }
  reportNonUtf8(p => p);
  resultExit(w.newCount ? 1 : 0);
}
