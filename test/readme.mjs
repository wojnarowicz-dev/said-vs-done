// said-vs-done — layer 10: does the README tell the truth?
//
// THE JOKE THAT IS NOT ONE. This tool checks whether the sentences a project
// shows its customers are backed by its code. Its own README is a page of
// sentences about what its code does. A tool that cannot be pointed at its own
// documentation has not understood its own premise.
//
// So the README is a checkable artefact, not prose. Every claim below is
// tagged in the Markdown and re-derived here from the running tool. When they
// disagree the README is wrong until somebody says otherwise — the code is the
// fact and the README is the claim, which is the same order of authority the
// tool applies to everybody else.
//
// HOW A CLAIM IS TAGGED. An HTML comment carrying a name and a value:
//
//     <!-- svd:claim name=lexicon.pl value=232 -->
//
// It is invisible when rendered and impossible to update by accident, which is
// the point: a number in prose drifts silently, a tagged number fails a build.
//
// WHAT IS NOT CHECKED, deliberately: the prose. No test can tell whether an
// explanation is honest. What it can tell is whether the numbers, the commands,
// the flags and the file names in it are real — and every documentation lie
// this project has told so far has been one of those.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lexiconSize, AREAS, LANGUAGES } from '../src/promise.mjs';
import { VERDICTS } from '../src/coverage.mjs';
import { findPromises } from '../src/say.mjs';
import { checkCoverage } from '../src/done.mjs';
import { loadConfig } from '../src/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const README = path.join(ROOT, 'README.md');
const CLI = path.join(ROOT, 'bin', 'said-vs-done.mjs');
const SITE = path.join(HERE, 'fixtures', 'site');
const APP = path.join(HERE, 'fixtures', 'app');
const CONFIG = path.join(HERE, 'fixtures', 'golden.config.json');

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + name.padEnd(46) + (detail || ''));
};

console.log('said-vs-done — does the README tell the truth\n');

if (!fs.existsSync(README)) {
  console.log('  FAIL  there is no README.md');
  process.exit(1);
}
const text = fs.readFileSync(README, 'utf8');

// ---------------------------------------------------------------- the truths
const cfg = loadConfig(['--config', CONFIG], SITE);
const fixture = findPromises(SITE, cfg);
const coverage = checkCoverage(SITE, [SITE, APP], cfg);
const lex = lexiconSize();
const verdictCounts = {};
for (const v of VERDICTS) verdictCounts[v] = coverage.judged.filter(j => j.verdict.verdict === v).length;

const TRUTH = {
  'lexicon.pl': lex.pl,
  'lexicon.en': lex.en,
  'lexicon.de': lex.de,
  'lexicon.es': lex.es,
  'lexicon.edge': lex.edge,
  'areas': AREAS.length,
  'languages': LANGUAGES.length,
  'verdicts': VERDICTS.length,
  'fixture.promises': fixture.promises.length,
  'fixture.sure': fixture.promises.filter(p => p.tier === 'sure').length,
  'fixture.edge': fixture.promises.filter(p => p.tier === 'edge').length,
  'fixture.covered': verdictCounts.covered,
  'testLayers': fs.readdirSync(HERE).filter(f => f.endsWith('.mjs') && f !== 'all.mjs').length,
};

// ---------------------------------------------------------------- 1. claims
const claims = [...text.matchAll(/<!--\s*svd:claim\s+name=([\w.]+)\s+value=([^\s]+)\s*-->/g)]
  .map(m => ({ name: m[1], value: m[2] }));

check('the README carries tagged claims', claims.length > 0, claims.length + ' found');

for (const c of claims) {
  if (!(c.name in TRUTH)) {
    check('claim ' + c.name, false, 'no such measurement — the claim names something the tool does not report');
    continue;
  }
  check('claim ' + c.name, String(TRUTH[c.name]) === c.value,
    'README says ' + c.value + ', the tool says ' + TRUTH[c.name]);
}

// Every measurement should be claimed somewhere, or the gate protects nothing.
const unclaimed = Object.keys(TRUTH).filter(k => !claims.some(c => c.name === k));
check('every measurement is claimed in the README', unclaimed.length === 0,
  unclaimed.length ? 'unclaimed: ' + unclaimed.join(', ') : Object.keys(TRUTH).length + ' measurements');

// ---------------------------------------------------------------- 2. commands
//
// EVERY COMMAND SHOWN MUST RUN. odd-one-out shipped a help screen telling
// people to type a command that did not exist until `npm i -g`, and the README
// is the likeliest place for the same mistake: a flag renamed in the code and
// left standing in the examples.
const commands = [...text.matchAll(/^\s{4}\$ said-vs-done (.+)$/gm)].map(m => m[1].trim());
check('the README shows runnable commands', commands.length > 0, commands.length + ' found');

for (const line of commands) {
  const args = line.split(/\s+/)
    .map(a => a.replace('<text-dir>', SITE).replace('<repo>', APP).replace('<site>', SITE));
  const r = spawnSync(process.execPath, [CLI, ...args, '--config', CONFIG, '--top', '0'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e9, timeout: 60000 });
  // 0 and 1 are results; 2 is a usage error, which is what a stale example
  // produces. A crash is anything else.
  const ok = r.status === 0 || r.status === 1;
  check('runs: said-vs-done ' + line.slice(0, 34), ok,
    ok ? 'exit ' + r.status : 'exit ' + r.status + '  ' +
      String(r.stderr || r.stdout).trim().split(/[\r\n]+/).slice(-1)[0].slice(0, 70));
}

// ------------------------------------------------- 2a. what the reader can run
//
// THE GATE USED TO MEASURE WHERE THE ERROR COULD NOT HAPPEN. Every command on
// this page is executed above — in the CLONE, where `test/fixtures/` exists.
// The person who installs from npm has no such directory: `files` ships bin,
// src, the page and the licence. So the three examples under "Use" pointed at
// something no reader has, this layer ran them happily, and there was no input
// at which it would have said otherwise.
//
// That is a check whose result does not depend on the state of the world —
// inside a tool whose whole job is to ask whether a promise made to a customer
// has anything behind it. Its own page promised three commands with nothing
// behind them in the package, and its own gate could not see it, because it
// was standing on the wrong side: in the repository rather than where the
// reader stands.
//
// A clone-only example is legitimate; it has to SAY so where a machine can
// read it, and be skipped out loud. The prose above the block already said it.
// Nothing enforced it.
{
  const packed = JSON.parse(spawnSync('npm', ['pack', '--dry-run', '--json'],
    { cwd: ROOT, encoding: 'utf8', shell: true, maxBuffer: 1e9 }).stdout);
  const shipped = new Set(packed[0].files.map(f => f.path.replace(/\\/g, '/')));
  const shipsDir = d => [...shipped].some(f => f === d || f.startsWith(d.replace(/\/+$/, '') + '/'));

  check('the package list could be read', shipped.size > 0, shipped.size + ' files');

  const lines = text.split(/\r?\n/);
  let runnable = 0, marked = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s{4}\$ said-vs-done (.+)$/);
    if (!m) continue;

    // The marker is read from the eight lines above the block, because one
    // sentence can cover a run of examples — as it does here.
    const near = lines.slice(Math.max(0, i - 8), i).join('\n');
    const cloneOnly = /<!--\s*svd:clone-only\s+reason="([^"]+)"\s*-->/.exec(near);

    const paths = m[1].split(/\s+/)
      .filter(a => !a.startsWith('--') && !a.startsWith('<') && a !== '.')
      .filter(a => /[/\\]/.test(a) || /^[\w.-]+\.\w+$/.test(a));
    // A PATH THE READER SUPPLIES IS NOT A PATH THIS PACKAGE OWES THEM.
    // `./src/main/java` names a directory in THEIR project and is nowhere in
    // this repository; `test/fixtures/project` is in this repository and does
    // not ship. Only the second kind is a broken promise, and telling them
    // apart is one question: does it exist here?
    const outside = paths.filter(p => fs.existsSync(path.join(ROOT, p))
      && !shipped.has(p) && !shipsDir(p));
    if (!outside.length) { runnable++; continue; }

    if (cloneOnly) {
      marked++;
      console.log('  skip  said-vs-done ' + m[1].slice(0, 40));
      console.log('        ' + cloneOnly[1] + '   (' + outside.join(', ') + ')');
      continue;
    }
    check('an example points at something the reader has', false,
      'said-vs-done ' + m[1].slice(0, 28) + '  ->  ' + outside.join(', ') + ' is not in the package');
  }
  check('every example is runnable or marked clone-only', true,
    runnable + ' runnable, ' + marked + ' marked');
}

// ---------------------------------------------------------------- 2b. npx
//
// THE FIRST COMMAND ANYBODY TYPES, AND NOTHING WAS CHECKING IT. The page opens
// with "run it without installing" and an npx line, and the gate above never
// saw it: that pattern wants the prompt form, and the npx block is written
// without one. Three of these four tools had the same hole.
//
// TWO THINGS ARE ASKED, because they fail differently. A wrong package name
// sends the reader to somebody else's package, and no amount of running the
// tool locally would show it. A stale sub-command is the ordinary drift the
// gate above already watches for, in a place it could not reach.
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const binNames = Object.keys(pkg.bin || {});
  const npx = [...text.matchAll(/\bnpx\s+([a-z0-9@._-]+)([^\n`]*)/gi)]
    .map(m => ({ pkg: m[1], rest: (m[2] || '').trim() }));

  check('the README shows an npx line at all', npx.length > 0, npx.length + ' found');

  const wrongName = npx.filter(n => n.pkg.replace(/@.*$/, '') !== pkg.name);
  check('npx names this package', wrongName.length === 0,
    wrongName.length ? 'says ' + wrongName[0].pkg + ', package is ' + pkg.name : pkg.name);

  check('the npx name is an executable', binNames.includes(pkg.name),
    binNames.length ? 'bin: ' + binNames.join(', ') : 'no bin at all');

  for (const n of npx) {
    // TRAILING PUNCTUATION, BUT NOT AN ARGUMENT. A dot glued to a word ends a
    // sentence; a dot standing alone is a directory. Getting this backwards in
    // the sibling tool made the gate run a bare sub-command, take exit 2 back
    // and call it a pass.
    const rest = n.rest.replace(/(?<=[A-Za-z0-9])[.,;:]$/, '').replace(/[,;:]$/, '').trim();
    if (!rest) continue;
    const args = rest.split(/\s+/)
      .map(a => a.replace('<text-dir>', SITE).replace('<repo>', APP).replace('<site>', SITE));
    const r = spawnSync(process.execPath, [CLI, ...args, '--config', CONFIG, '--top', '0'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e9, timeout: 60000 });
    const ok = r.status === 0 || r.status === 1;
    check('runs: npx ' + pkg.name + ' ' + rest.slice(0, 26), ok,
      ok ? 'exit ' + r.status : 'exit ' + r.status + '  ' +
        String(r.stderr || r.stdout).trim().split(/[\r\n]+/).slice(-1)[0].slice(0, 50));
  }
}

// ---------------------------------------------------------------- 3. names
//
// Every flag, verdict and source file the README names must exist. This is the
// cheapest check here and it catches the commonest rot: a section describing a
// module that was renamed three commits ago.
const flags = [...new Set([...text.matchAll(/`--([a-z-]+)`/g)].map(m => m[1]))];
const KNOWN_FLAGS = new Set(['code', 'json', 'lang', 'config', 'tier', 'area', 'only', 'top', 'all', 'help', 'version', 'update', 'fail-on-state']);
const badFlags = flags.filter(f => !KNOWN_FLAGS.has(f));
check('every flag named in the README exists', badFlags.length === 0,
  badFlags.length ? 'unknown: --' + badFlags.join(', --') : flags.length + ' flags');

const files = [...new Set([...text.matchAll(/`((?:src|bin|test)\/[\w.-]+\.(?:mjs|json))`/g)].map(m => m[1]))];
const badFiles = files.filter(f => !fs.existsSync(path.join(ROOT, f)));
check('every file named in the README exists', badFiles.length === 0,
  badFiles.length ? 'missing: ' + badFiles.join(', ') : files.length + ' files');

const namedVerdicts = [...new Set([...text.matchAll(/`(covered|no-witness|elsewhere|inspect)`/g)].map(m => m[1]))];
check('every verdict named in the README exists',
  namedVerdicts.every(v => VERDICTS.includes(v)),
  namedVerdicts.length + ' named of ' + VERDICTS.length);

// ---------------------------------------------------------------- 4. the layers
//
// The README lists the test layers. A layer added without a line here, or a
// line kept after a layer is deleted, is documentation that has stopped
// describing the thing.
const listed = [...new Set([...text.matchAll(/`npm run ([a-z-]+)`/g)].map(m => m[1]))];
const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
const badScripts = listed.filter(s => !(s in scripts));
check('every npm script named in the README exists', badScripts.length === 0,
  badScripts.length ? 'missing: ' + badScripts.join(', ') : listed.length + ' scripts');

// ---------------------------------------------------------------- 5. the badges
//
// A GREEN BADGE OVER MATERIAL NOBODY OPENED IS THIS TOOL'S OWN SUBJECT, printed
// in the one place every visitor looks first. CI cannot reach the two private
// checkouts the known answers need, so `npm test` exits 2 there and the job is
// deliberately left green — which would be a lie standing on its own. The
// second badge is what stops it standing on its own, and a number in a badge
// rots exactly like a number in prose.
//
// So it is measured rather than trusted: the known-answers layer is run again
// with its material pointed at a path that does not exist, which is precisely
// the state CI is in, and the badge must agree with what comes back.
const NOWHERE = path.join(ROOT, 'no-such-checkout');
const ci = spawnSync(process.execPath, [path.join(HERE, 'known-answers.mjs')], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 1e9, timeout: 120000,
  env: { ...process.env, SVD_WEB: NOWHERE, SVD_APP: NOWHERE },
});
const ciOut = (ci.stdout || '') + (ci.stderr || '');
const ciRows = ciOut.match(/^ {2}(PASS|FAIL|SKIP) /gm) || [];
const ciSkipped = ciRows.filter(r => r.includes('SKIP')).length;
const ciCheckable = ciRows.length - ciSkipped;

// The exit code is half the claim: the badge says what CI covers, the code says
// what CI reports. If this ever came back 0 the badge would be describing a
// state that no longer happens.
check('with no material the known answers exit 2', ci.status === 2,
  'exit ' + ci.status + ', ' + ciRows.length + ' answers, ' + ciSkipped + ' skipped');

const badge = text.match(/known%20answers-(\d+)%20of%20(\d+)%20checked%20in%20CI/);
check('the README carries the CI-coverage badge', !!badge,
  badge ? badge[1] + ' of ' + badge[2] : 'no known-answers badge found');

if (badge) {
  check('badge: known answers CI can check', Number(badge[1]) === ciCheckable,
    'badge says ' + badge[1] + ', a run with no material gives ' + ciCheckable);
  check('badge: known answers in total', Number(badge[2]) === ciRows.length,
    'badge says ' + badge[2] + ', the layer reports ' + ciRows.length);
}

// THE SENTENCE BESIDE THE BADGE IS A CLAIM TOO, and the first CI run caught it
// lying: it said nine layers where eight had run, because `resilience` set its
// scenario up with a Windows program and skipped on the Linux runner. The
// number was in prose, next to a badge whose numbers were checked, and prose is
// exactly where a number rots. So it is derived here instead — every layer but
// the one that needs private material.
const covered = text.match(/\*\*(\d+) of the (\d+) layers\*\*/);
check('the README states what CI covers', !!covered,
  covered ? covered[1] + ' of ' + covered[2] : 'no "N of the M layers" claim found');

if (covered) {
  check('badge prose: layers CI can run', Number(covered[1]) === TRUTH.testLayers - 1,
    'README says ' + covered[1] + ', the tool has ' + TRUTH.testLayers +
    ' layers of which known-answers needs private material');
  check('badge prose: layers in total', Number(covered[2]) === TRUTH.testLayers,
    'README says ' + covered[2] + ', the tool has ' + TRUTH.testLayers);
}

// The workflow is named in the badge URL, so it has to be there.
const wf = [...new Set([...text.matchAll(/actions\/workflows\/([\w.-]+)\/badge\.svg/g)].map(m => m[1]))];
const badWf = wf.filter(f => !fs.existsSync(path.join(ROOT, '.github', 'workflows', f)));
check('every workflow named in a badge exists', badWf.length === 0,
  badWf.length ? 'missing: ' + badWf.join(', ') : wf.join(', ') || 'none named');

console.log('\n  ' + (failed ? failed + ' failed' : 'the README agrees with the tool'));
if (failed) {
  console.log('\n  The code is the fact and the README is the claim. Fix the claim, or fix the');
  console.log('  code and re-record — but do not let a page of sentences drift away from what');
  console.log('  it describes. That is the defect this whole tool is about.');
  process.exit(1);
}
