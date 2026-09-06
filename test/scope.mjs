// said-vs-done — layer 7: the scope of a run must never pass for a finding.
//
// THIS LAYER EXISTS BECAUSE OF ONE BUG, and it is the worst this tool has had.
// It reported that a site promised deletion after 90 days and nothing in the
// code deleted. The code that deletes was in the project's OTHER repository,
// which the run had never been shown. The verdict was not merely wrong: it was
// printed in the words of a checked conclusion when it was an absence of
// material — the exact class of defect said-vs-done exists to catch, produced
// by said-vs-done.
//
// Three properties, each of which was false before the fix.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkCoverage } from '../src/done.mjs';
import { loadConfig } from '../src/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CLI = path.join(ROOT, 'bin', 'said-vs-done.mjs');
const SITE = path.join(HERE, 'fixtures', 'site');
const APP = path.join(HERE, 'fixtures', 'app');
const CONFIG = path.join(HERE, 'fixtures', 'golden.config.json');
const cfg = loadConfig(['--config', CONFIG], SITE);

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + name.padEnd(52) + (detail || ''));
};

console.log('said-vs-done — scope\n');

// The fixture's planted promise: "30 days", kept only in the app fixture.
const thirty = (judged) => judged.filter(({ promise: p }) =>
  p.area === 'deletion' && /\b30\b/.test(p.sentence) && !p.negated);

// ---- 1. one root: the promise is NOT covered, and the verdict is marked
const one = checkCoverage(SITE, [SITE], cfg);
const oneThirty = thirty(one.judged);
check('site only: the 30-day promise is not covered',
  oneThirty.length > 0 && oneThirty.every(j => j.verdict.verdict !== 'covered'),
  oneThirty.length + ' promise(s), verdicts ' +
  [...new Set(oneThirty.map(j => j.verdict.verdict))].join('/'));

// ---- 2. both roots: it IS covered, and the evidence comes from the second one
const both = checkCoverage(SITE, [SITE, APP], cfg);
const bothThirty = thirty(both.judged);
const fromApp = bothThirty.filter(j => (j.verdict.evidence || []).some(e => /\.sql$/.test(e.file.split(':')[0])));
check('site + app: the same promise is covered',
  bothThirty.length > 0 && bothThirty.every(j => j.verdict.verdict === 'covered'),
  bothThirty.length + ' promise(s), verdicts ' +
  [...new Set(bothThirty.map(j => j.verdict.verdict))].join('/'));
check('and the evidence comes from the second root',
  fromApp.length > 0,
  fromApp.length ? fromApp[0].verdict.evidence[0].file + ':' + fromApp[0].verdict.evidence[0].line : 'no .sql evidence');

// ---- 3. no --code at all: every no-witness carries the caveat
//
// THE PROPERTY THAT MATTERS. A run that was never told where to look may still
// report no-witness — that is allowed — but it may not report it as if the
// scope had been stated.
const unstated = checkCoverage(SITE, [], cfg);
const noWitness = unstated.judged.filter(j => j.verdict.verdict === 'no-witness');
check('scope unstated: no-witness carries a caveat',
  noWitness.length === 0 || noWitness.every(j => j.verdict.caveat === 'scopeUnset'),
  noWitness.length + ' no-witness verdict(s), ' +
  noWitness.filter(j => j.verdict.caveat === 'scopeUnset').length + ' marked');
check('scope stated: no caveat',
  both.judged.every(j => !j.verdict.caveat),
  'none of ' + both.judged.length + ' carries one');

// ---- 4. every verdict records where it looked
check('every verdict records the roots it searched',
  both.judged.every(j => Array.isArray(j.verdict.searched) && j.verdict.searched.length === 2),
  'searched = ' + JSON.stringify(both.judged[0]?.verdict.searched || []));

// ---- 5. the banner reaches a person, not just the data
//
// A caveat in a JSON field nobody prints is not a warning. The run without
// --code has to SAY so on the terminal.
const bare = spawnSync(process.execPath, [CLI, 'done', SITE, '--config', CONFIG, '--top', '0'],
  { encoding: 'utf8', maxBuffer: 1e9 });
const withCode = spawnSync(process.execPath, [CLI, 'done', SITE, '--code', SITE, APP, '--config', CONFIG, '--top', '0'],
  { encoding: 'utf8', maxBuffer: 1e9 });
const bareOut = (bare.stdout || '') + (bare.stderr || '');
const codeOut = (withCode.stdout || '') + (withCode.stderr || '');
check('a run without --code prints the banner',
  /NO --code GIVEN/.test(bareOut), '');
check('a run with --code does not',
  !/NO --code GIVEN/.test(codeOut), '');

console.log('\n  ' + (failed ? failed + ' failed' : 'all properties hold'));
if (failed) {
  console.log('\n  An unstated scope printed as a finding is the bug this layer exists for.');
  process.exit(1);
}
