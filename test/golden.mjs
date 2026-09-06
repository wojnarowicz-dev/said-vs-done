// said-vs-done — layer 1: golden tests.
//
// A full run over the fixtures, its --json output compared field by field with
// a recorded expectation.
//
// WHAT IS COMPARED. Everything the snapshot holds except the two fields that
// cannot be stable: `createdAt`, and `root` (an absolute path on this machine).
// THE FINGERPRINTS ARE COMPARED TOO, and that is the part that earns its keep:
// a promise's id is built from stage, area, file and anchor, so a change that
// leaves every count identical while shifting what each finding IS shows up
// here and nowhere else.
//
//     node test/golden.mjs            check
//     node test/golden.mjs --update   re-record the expectations
//
// --update rewrites the recorded files. Read the diff it produces before
// committing it: an expectation updated without looking is a test deleted.
//
// EVERY CASE PINS --config, and that is not decoration. loadConfig() looks for
// .said-vs-done.json in the scanned directory and then in the CURRENT WORKING
// DIRECTORY, so this repository's own config — which excludes test/fixtures so
// that a self-run stays quiet — reached into the golden runs and emptied every
// one of them: "No .html/.js/.md files found", exit 0, no snapshot. A golden
// test that changes its verdict because of a file somewhere above it is
// measuring the machine, not the tool.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CLI = path.join(ROOT, 'bin', 'said-vs-done.mjs');
const GOLD = path.join(HERE, 'golden');
const UPDATE = process.argv.includes('--update');
const CONFIG = 'test/fixtures/golden.config.json';

const CASES = [
  { name: 'say', args: ['say', 'test/fixtures/site'] },
  { name: 'say-sure', args: ['say', 'test/fixtures/site', '--tier', 'sure'] },
  // BOTH SIDES OF THE SCOPE QUESTION ARE RECORDED. `done-site` is the run that
  // has not been shown the implementation and `done-both` is the run that has;
  // the pair is the regression test for the false alarm, pinned at the level of
  // whole snapshots rather than of one assertion.
  { name: 'done-site', args: ['done', 'test/fixtures/site', '--code', 'test/fixtures/site'] },
  { name: 'done-both', args: ['done', 'test/fixtures/site', '--code', 'test/fixtures/site', 'test/fixtures/app'] },
  { name: 'done-all-tiers', args: ['done', 'test/fixtures/site', '--tier', 'all', '--code', 'test/fixtures/site', 'test/fixtures/app'] },
].map(c => ({ ...c, args: [...c.args, '--config', CONFIG] }));

const slash = s => String(s).split(path.sep).join('/');

/** Drops what cannot be stable between machines and runs; keeps everything else. */
function normalise(snap) {
  const { createdAt, root, ...rest } = snap;
  const counts = { ...(rest.counts || {}) };
  // The labels of the code roots are basenames, which are stable; their
  // absolute paths are not, and are not in the snapshot to begin with.
  return {
    ...rest,
    counts,
    root: slash(path.relative(ROOT, root)) || '.',
    findings: (rest.findings || []).map(f => ({ ...f, file: slash(f.file) })),
  };
}

/** Field-level difference, so a failure says WHAT moved rather than "not equal". */
function differences(a, b, prefix = '') {
  const out = [];
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
  for (const k of keys) {
    const x = a ? a[k] : undefined, y = b ? b[k] : undefined;
    const p = prefix ? prefix + '.' + k : k;
    const obj = v => v && typeof v === 'object' && !Array.isArray(v);
    if (obj(x) && obj(y)) { out.push(...differences(x, y, p)); continue; }
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) out.push(p + ': ' + x.length + ' entries -> ' + y.length);
      const n = Math.min(x.length, y.length);
      for (let i = 0; i < n; i++) {
        if (obj(x[i]) && obj(y[i])) out.push(...differences(x[i], y[i], p + '[' + i + ']'));
        else if (JSON.stringify(x[i]) !== JSON.stringify(y[i]))
          out.push(p + '[' + i + ']: ' + JSON.stringify(x[i]) + ' -> ' + JSON.stringify(y[i]));
      }
      continue;
    }
    if (JSON.stringify(x) !== JSON.stringify(y))
      out.push(p + ': ' + JSON.stringify(x) + ' -> ' + JSON.stringify(y));
  }
  return out;
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'svd-golden-'));
fs.mkdirSync(GOLD, { recursive: true });

let failed = 0, updated = 0, passed = 0;
console.log('said-vs-done — golden tests\n');

for (const c of CASES) {
  // A FRESH snapshot path every time: the stages diff against whatever the file
  // already holds, so reusing one would make the result depend on the order the
  // cases ran in.
  const out = path.join(TMP, c.name + '.json');
  const r = spawnSync(process.execPath, [CLI, ...c.args, '--lang', 'en', '--json', out],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e9 });

  if (!fs.existsSync(out)) {
    console.log('  FAIL  ' + c.name.padEnd(15) + 'no snapshot written (exit ' + r.status + ')');
    console.log('        ' + String(r.stderr || r.stdout).trim().split(/[\r\n]+/).slice(-3).join(' | ').slice(0, 200));
    failed++;
    continue;
  }

  const got = normalise(JSON.parse(fs.readFileSync(out, 'utf8')));
  const expFile = path.join(GOLD, c.name + '.json');

  if (UPDATE || !fs.existsSync(expFile)) {
    const had = fs.existsSync(expFile);
    const before = had ? JSON.parse(fs.readFileSync(expFile, 'utf8')) : null;
    fs.writeFileSync(expFile, JSON.stringify(got, null, 2) + '\n');
    const d = had ? differences(before, got) : [];
    console.log('  ' + (had ? 'UPDATED' : 'RECORDED').padEnd(8) + c.name.padEnd(15) +
      got.findings.length + ' findings' + (had && d.length ? '  (' + d.length + ' fields changed)' : ''));
    for (const line of d.slice(0, 10)) console.log('          ' + line);
    updated++;
    continue;
  }

  const exp = JSON.parse(fs.readFileSync(expFile, 'utf8'));
  const d = differences(exp, got);
  if (d.length === 0) {
    console.log('  PASS  ' + c.name.padEnd(15) + got.findings.length + ' findings, fingerprints identical');
    passed++;
  } else {
    console.log('  FAIL  ' + c.name.padEnd(15) + d.length + ' field(s) differ from ' +
      slash(path.relative(ROOT, expFile)));
    for (const line of d.slice(0, 12)) console.log('          ' + line);
    if (d.length > 12) console.log('          ... and ' + (d.length - 12) + ' more');
    failed++;
  }
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

console.log('\n  ' + passed + ' passed, ' + failed + ' failed' + (updated ? ', ' + updated + ' recorded' : ''));
if (failed) {
  console.log('\n  A recorded run changed. Either the change is wrong, or the recording is\n' +
    '  out of date — decide which before running --update.');
  process.exit(1);
}
