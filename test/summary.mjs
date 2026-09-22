// said-vs-done — the four numbers, on every path of every command.
//
// WHY THIS LAYER EXISTS. `done` carried the `summary` field on screen and in
// the JSON; `say` carried it ONLY on the early exit, when nothing had been
// read. So a CI job reading `summary.unreachable` from `say` got an object
// when something had broken and `undefined` when everything had worked — the
// field was present exactly where it was least needed and absent where the run
// had something to report. That is the reverse of what it was added for.
//
// IT WAS FOUND FROM THE INSTALLED PACKAGE, after 0.2.2 shipped, and not by any
// layer here. The README was precise — "every `done` run carries that summary
// field" — so nothing was lying; the field simply stopped at one command of
// two. THE LESSON THAT KEEPS RECURRING IN THIS PROJECT: check every command,
// not the main one. `say` had the same early-exit defect as `done` once
// before, and it was found the same way, late.
//
// WHAT IS CHECKED, for both commands and both outcomes:
//
//   1. the four numbers are printed on screen;
//   2. the same four are in the --json file, with the unreachableIs breakdown;
//   3. screen and file agree — a report that disagrees with its own data file
//      is worse than one that prints nothing, because both look authoritative;
//   4. `actionable` agrees with the exit code: 1 on a first run with promises
//      to report, and a run that reports none does not claim any.
//
// A run with nothing to read is checked as carefully as a healthy one. Those
// two must not look alike, and that sentence is the whole of this tool.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CLI = path.join(ROOT, 'bin', 'said-vs-done.mjs');
const SITE = path.join(HERE, 'fixtures', 'site');
const APP = path.join(HERE, 'fixtures', 'app');
const CONFIG = path.join(HERE, 'fixtures', 'golden.config.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'svd-summary-'));

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log('  ' + (ok ? 'PASS  ' : 'FAIL  ') + name.padEnd(56) + (detail || ''));
};

const KEYS = ['actionable', 'explained', 'notApplicable', 'unreachable'];

function run(args, jsonName) {
  const out = jsonName ? path.join(TMP, jsonName) : null;
  const r = spawnSync(process.execPath,
    [CLI, ...args, '--lang', 'en', ...(out ? ['--json', out] : [])],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e9 });
  const text = (r.stdout || '') + (r.stderr || '');
  let json = null;
  try { if (out && fs.existsSync(out)) json = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { json = null; }
  return { status: r.status, text, json };
}

// The printed line, parsed back. Reading it rather than trusting the JSON is
// the point: the screen is what a person acts on.
function onScreen(text) {
  const m = /summary: actionable=(\d+)\s+explained=(\d+)\s+notApplicable=(\d+)\s+unreachable=(\d+)/.exec(text);
  if (!m) return null;
  return { actionable: +m[1], explained: +m[2], notApplicable: +m[3], unreachable: +m[4] };
}

console.log('said-vs-done — the four numbers, on every path\n');

const CASES = [
  { name: 'say, healthy', args: ['say', SITE, '--config', CONFIG], file: 'say-ok.json', reads: true },
  { name: 'say, nothing to read', args: ['say', path.join(TMP, 'empty')], file: null, reads: false },
  { name: 'done, healthy', args: ['done', SITE, '--code', APP, '--config', CONFIG], file: 'done-ok.json', reads: true },
  { name: 'done, nothing to read', args: ['done', path.join(TMP, 'empty'), '--code', APP], file: null, reads: false },
];
fs.mkdirSync(path.join(TMP, 'empty'), { recursive: true });

for (const c of CASES) {
  const r = run(c.args, c.file);
  const screen = onScreen(r.text);

  check(c.name + ': four numbers on screen', screen !== null,
    screen ? KEYS.map(k => k + '=' + screen[k]).join(' ') + '  exit ' + r.status
      : 'no summary line, exit ' + r.status);
  if (!screen) continue;

  if (c.file) {
    const s = r.json && r.json.summary;
    check(c.name + ': four numbers in the JSON', !!s && KEYS.every(k => typeof s[k] === 'number'),
      s ? KEYS.map(k => k + '=' + s[k]).join(' ') : 'no summary in the snapshot');
    if (s) {
      check(c.name + ': the screen and the file agree',
        KEYS.every(k => s[k] === screen[k]),
        KEYS.filter(k => s[k] !== screen[k]).map(k => k + ': ' + screen[k] + ' vs ' + s[k]).join(', ') || 'identical');
      check(c.name + ': unreachable is broken into its two halves',
        !!s.unreachableIs && typeof s.unreachableIs.aQuestionForAPerson === 'number'
          && typeof s.unreachableIs.couldNotBeRead === 'number'
          && s.unreachableIs.aQuestionForAPerson + s.unreachableIs.couldNotBeRead === s.unreachable,
        s.unreachableIs ? JSON.stringify(s.unreachableIs) : 'missing');
    }
  }

  // THE NUMBER AND THE CODE MUST AGREE. A first run against a fresh snapshot
  // has no baseline, so everything it reports is new: something actionable
  // means exit 1, nothing actionable means it must not be 1.
  if (c.reads) {
    check(c.name + ': actionable agrees with the exit code',
      screen.actionable > 0 ? r.status === 1 : r.status !== 1,
      'actionable=' + screen.actionable + ', exit ' + r.status);
  } else {
    // NOTHING READ IS NOT A CLEAN RESULT, and the number has to say so as
    // loudly as the sentence above it does.
    check(c.name + ': nothing read is counted and returns 2',
      screen.unreachable > 0 && screen.actionable === 0 && r.status === 2,
      'unreachable=' + screen.unreachable + ', actionable=' + screen.actionable + ', exit ' + r.status);
  }
}

fs.rmSync(TMP, { recursive: true, force: true });

console.log('');
if (failed) {
  console.log('  ' + failed + ' failed');
  console.log('');
  console.log('  A field that is present when a run breaks and absent when it');
  console.log('  works is worse than no field: a build reads it once, believes');
  console.log('  it, and never learns which runs it was missing from.');
  process.exit(1);
}
console.log('  both commands, both outcomes, screen and file in agreement');
