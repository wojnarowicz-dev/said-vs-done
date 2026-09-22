// said-vs-done — layer 3: failure resilience.
//
// ONE CRITERION: fail loudly, or carry on — never quietly return zero.
//
// The middle case is the dangerous one, and for this tool it is worse than for
// most: a run that finds no promises looks exactly like a project that makes
// none, and "you promise nothing" is a comforting answer nobody double-checks.
// It has already happened here — this repository's own .said-vs-done.json
// excludes test/fixtures, reached the fixture runs through the current working
// directory, and every one of them printed "No .html/.js/.md files found" and
// exited 0.
//
// Each scenario damages something on purpose, then the run is classified:
//
//   CRASH   the process died — loud, but not on purpose
//   LOUD    exit 2, the tool's code for "your input is the problem"
//   SPOKE   ran normally (exit 0 or 1) and said something a healthy run does not
//   SILENT  ran normally and said nothing new                <-- the failure
//
// EVERY SCENARIO RUNS TWICE: once damaged, once healthy. A phrase only counts
// as speaking about the damage if it appears in the damaged run AND NOT in the
// healthy one. A criterion a healthy run also satisfies measures nothing.
import { spawnSync, execFileSync } from 'node:child_process';
import { exitCodeFor } from '../src/summary.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CLI = path.join(ROOT, 'bin', 'said-vs-done.mjs');
const FIX = path.join(HERE, 'fixtures');
const CONFIG = path.join(FIX, 'golden.config.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'svd-resil-'));

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b);
  }
  return to;
}

let counter = 0;
const dir = (n) => {
  const d = path.join(TMP, n + '-' + (++counter));
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const site = (label) => copyTree(path.join(FIX, 'site'), path.join(dir(label), 'site'));
const app = (label) => copyTree(path.join(FIX, 'app'), path.join(dir(label), 'app'));

function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args, '--config', CONFIG],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1e9 });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const SCENARIOS = [];
// A SCENARIO MAY NAME THE CODE IT MUST RETURN.
//
// The states below grade what a run SAID. They do not grade what it returned,
// and an exit code is a contract with a build. Learned the hard way in the
// sibling tool: with the exit rule reverted, the decisive scenario there went
// from LOUD to SPOKE — a different label, both of them PASSING, and the layer
// stayed green over a build contract that had been undone.
// EVERY EXPECTATION IS CHECKED, NOT JUST ONE OF THEM.
//
// `speaks` used to be a flat list and a scenario counted as having spoken if
// ANY entry matched. A phrase that could no longer match anything therefore
// sat green forever, carried by a neighbour — and measuring this layer found
// two of them: `outside UTF-8` appears nowhere in this tool's source at all,
// and `unreadable` appears only in comments and a variable name. Both had
// been passing for as long as they had existed.
//
// But two scenarios legitimately list alternatives — `EPERM` on Windows and
// `EACCES` elsewhere, an errno and the sentence that carries it. The two
// cases are indistinguishable while both are written the same way, so they
// are no longer written the same way: an EXPECTATION IS A GROUP, every group
// must be satisfied, and any one spelling inside a group satisfies it. A
// deliberate alternative now looks like one, and a dead phrase has nowhere
// left to hide.
const scenario = (name, damage, build, speaks, control, expectExit = null) =>
  SCENARIOS.push({
    name, damage, build, control, expectExit,
    speaks: speaks.map(x => (Array.isArray(x) ? x : [x])),
  });

const healthySay = () => ['say', site('healthy')];

// THE EXIT CODE, NOT ONLY THE SENTENCE. This scenario passed for as long as
// it existed while the run exited 0 — it checked that the tool SAID nothing
// was read and never that it returned a number saying so.
scenario('empty text directory', 'nothing to read at all',
  () => ['say', dir('empty')],
  ['No .html/.js/.md files'],
  healthySay, 2);

// And the same door, through the other command.
scenario('empty text directory, judged', 'nothing to read, and a verdict asked for',
  () => ['done', dir('empty2'), '--code', dir('empty2')],
  ['No .html/.js/.md files'],
  healthySay, 2);

scenario('text root does not exist', 'the scanned path is not there',
  () => ['say', path.join(TMP, 'not-here')],
  ['not-here', 'no such path'],
  healthySay);

scenario('a --code path does not exist', 'one of several repositories is mistyped',
  () => ['done', site('typo'), '--code', site('typo'), path.join(TMP, 'mistyped-repo')],
  ['mistyped-repo', 'no such path'],
  () => { const s = site('healthy-code'); return ['done', s, '--code', s, app('healthy-code2')]; });

scenario('binary junk in a page', 'a file that is not text at all',
  () => {
    const d = site('junk');
    const junk = Buffer.alloc(2048);
    for (let i = 0; i < junk.length; i++) junk[i] = (i * 37) % 256;
    fs.writeFileSync(path.join(d, 'broken.html'), junk);
    return ['say', d];
  },
  ['not valid UTF-8', 'broken.html'],
  healthySay);

scenario('page saved in cp1250', 'bytes that are not valid UTF-8',
  () => {
    const d = site('cp1250');
    const head = Buffer.from('<html lang="pl"><body><p>Zg', 'utf8');
    const bytes = Buffer.from([0x88, 0x6f, 0x73, 0x7a, 0x65, 0x6e, 0x69, 0x61]);
    const tail = Buffer.from(' kasuję po 30 dniach.</p></body></html>', 'utf8');
    fs.writeFileSync(path.join(d, 'cp1250.html'), Buffer.concat([head, bytes, tail]));
    return ['say', d];
  },
  ['not valid UTF-8', 'cp1250.html'],
  healthySay);

scenario('truncated snapshot to diff against', 'previous run cut in half',
  () => {
    const d = site('cutsnap');
    const snap = path.join(d, 'run.json');
    fs.writeFileSync(snap, '{\n  "version": 1,\n  "detector": "say",\n  "findings": [\n    {"id": "abc');
    return ['say', d, '--json', snap];
  },
  ['could not be read'],
  () => {
    const d = site('goodsnap');
    const snap = path.join(d, 'run.json');
    run(['say', d, '--json', snap]);
    return ['say', d, '--json', snap];
  });

scenario('snapshot from a future version', 'a version the tool does not know',
  () => {
    const d = site('future');
    const snap = path.join(d, 'run.json');
    fs.writeFileSync(snap, JSON.stringify({ version: 999, tool: 'said-vs-done', detector: 'say', findings: [] }));
    return ['say', d, '--json', snap];
  },
  ['could not be read'],
  () => {
    const d = site('goodsnap2');
    const snap = path.join(d, 'run.json');
    run(['say', d, '--json', snap]);
    return ['say', d, '--json', snap];
  });

scenario('--json points at a directory', 'the snapshot cannot be written',
  () => ['say', site('snapdir'), '--json', dir('is-a-directory')],
  ['EISDIR', 'that is a directory'],
  () => { const d = site('snapfile'); return ['say', d, '--json', path.join(d, 'run.json')]; });

scenario('unreadable page', 'read permission denied',
  () => {
    const d = site('locked');
    const target = path.join(d, 'locked.html');
    fs.copyFileSync(path.join(d, 'privacy.html'), target);
    // TWO PLATFORMS, ONE SCENARIO, AND CI IS WHY.
    //
    // This was `icacls` and nothing else. `icacls` is a Windows program, so on
    // the Linux runner it failed, the scenario skipped, the whole layer exited
    // 2 — and the layer that exists to prove this tool fails loudly was the one
    // thing continuous integration never ran. It said so in the run summary
    // rather than passing quietly, which is the behaviour working exactly as
    // intended; this is the fix it asked for.
    if (process.platform === 'win32') {
      const who = process.env.USERNAME || process.env.USER;
      if (!who) return { skip: 'no USERNAME to deny' };
      try { execFileSync('icacls', [target, '/deny', who + ':(R)'], { stdio: 'ignore' }); }
      catch (e) { return { skip: 'icacls failed: ' + String(e.message).slice(0, 60) }; }
    } else {
      try { fs.chmodSync(target, 0); }
      catch (e) { return { skip: 'chmod failed: ' + String(e.message).slice(0, 60) }; }
    }
    // NOT A FORMALITY. Mode bits do not stop root, and an administrator can
    // read through a deny ACE. If the file is still readable the scenario has
    // not been set up, and saying so is the only honest outcome — a run that
    // reported "failed loudly" here without the file being locked would be
    // this suite telling itself what it wants to hear.
    try { fs.readFileSync(target); return { skip: 'the file is still readable; the deny did not take' }; }
    catch { return ['say', d]; }
  },
  ['locked.html', ['EPERM', 'EACCES', 'Cannot read']],
  healthySay);

// THE ONE THAT IS THIS TOOL'S OWN. A `done` run with no --code at all is not
// damaged input — it is a legitimate invocation whose ANSWER is narrower than
// it looks. It must say so, and the healthy run with --code must not.
scenario('coverage run with no --code', 'the scope was never stated',
  () => ['done', site('noscope')],
  ['NO --code GIVEN'],
  () => { const s = site('scoped'); return ['done', s, '--code', s, app('scoped2')]; });

// ------------------------------------------------------------- the rule itself
//
// THE SCENARIOS TEST THE TOOL. THIS TESTS THE RULE THAT SCORES IT. A run
// cannot exercise every shape of summary — `inspect` in particular needs real
// policy text and does not occur in any fixture here — so the rule is asked
// directly, with summaries written down rather than produced.
//
// The first row is the whole reason this tool's rule differs from its
// sibling's by one word. Measured on pinned corpora, with not one accusation
// between them: matomo covered 27, inspect 5; joplin covered 125, inspect 9.
// Keyed on the whole of `unreachable`, both would exit 2 forever, over
// material read perfectly well.
const RULES = [
  ['questions, nothing unread, nothing accused', 0,
    { actionable: 0, explained: 27, notApplicable: 10, unreachable: 5,
      unreachableIs: { aQuestionForAPerson: 5, couldNotBeRead: 0 } }, 0],
  ['the same, with more of them', 0,
    { actionable: 0, explained: 125, notApplicable: 39, unreachable: 9,
      unreachableIs: { aQuestionForAPerson: 9, couldNotBeRead: 0 } }, 0],
  ['nothing read at all', 2,
    { actionable: 0, explained: 0, notApplicable: 0, unreachable: 1,
      unreachableIs: { aQuestionForAPerson: 0, couldNotBeRead: 1 } }, 0],
  ['nothing read, and questions too', 2,
    { actionable: 0, explained: 0, notApplicable: 0, unreachable: 4,
      unreachableIs: { aQuestionForAPerson: 3, couldNotBeRead: 1 } }, 0],
  ['unread, but the run still accused somebody', 1,
    { actionable: 2, explained: 5, notApplicable: 0, unreachable: 1,
      unreachableIs: { aQuestionForAPerson: 0, couldNotBeRead: 1 } }, 2],
  ['new accusations', 1,
    { actionable: 8, explained: 164, notApplicable: 40, unreachable: 19,
      unreachableIs: { aQuestionForAPerson: 19, couldNotBeRead: 0 } }, 8],
  ['accusations, but none of them new', 0,
    { actionable: 8, explained: 164, notApplicable: 40, unreachable: 19,
      unreachableIs: { aQuestionForAPerson: 19, couldNotBeRead: 0 } }, 0],
];

console.log('said-vs-done — failure resilience\n');
console.log('  what exit code a summary earns\n');
let ruleFailed = 0;
for (const [name, want, summary, newActionable] of RULES) {
  const got = exitCodeFor(summary, { newActionable });
  const ok = got === want;
  if (!ok) ruleFailed++;
  console.log('  ' + (ok ? 'ok    ' : 'FAIL  ') + name.padEnd(46) + want + (ok ? '' : ', got ' + got));
}
// And the state contract, for anyone who asks for it.
{
  const s2 = { actionable: 8, explained: 164, notApplicable: 40, unreachable: 19,
    unreachableIs: { aQuestionForAPerson: 19, couldNotBeRead: 0 } };
  const got = exitCodeFor(s2, { newActionable: 0, failOnState: true });
  const ok = got === 1;
  if (!ok) ruleFailed++;
  console.log('  ' + (ok ? 'ok    ' : 'FAIL  ') + '--fail-on-state turns old accusations red'.padEnd(46) + 1 + (ok ? '' : ', got ' + got));
}
console.log('');

const rows = [];
for (const s of SCENARIOS) {
  let args;
  try { args = s.build(); } catch (e) { args = { skip: String(e.message).slice(0, 70) }; }
  if (args && args.skip) { rows.push({ ...s, state: 'SKIP', detail: args.skip }); continue; }

  const damaged = run(args);
  const healthy = run(s.control());

  // A STACK TRACE IS A CRASH WHATEVER THE EXIT CODE SAYS.
  //
  // CRASH was read off the exit code alone — anything outside {0, 1, 2}. An
  // uncaught exception in Node exits 1, which that rule calls an ordinary
  // failure, so a run that died on a TypeError could be scored SPOKE and the
  // summary would print `0 CRASH` over it. The groups above catch the common
  // case, because a dead tool prints none of the phrases a working one would
  // — but they cannot catch a scenario whose expected phrase happens to
  // appear before the throw, and that is the only kind this hides.
  //
  // Two shapes, both the runtime's rather than this tool's: a V8 stack frame,
  // and an error class at the start of a line. This tool's own diagnostics
  // name errno codes — EISDIR, EPERM, EACCES — and print neither shape, so a
  // healthy run cannot match by accident.
  const STACK_FRAME = /^\s+at .+:\d+:\d+\)?\s*$/m;
  const ERROR_CLASS = /^[A-Za-z]*Error: /m;
  const looksLikeACrash = out => STACK_FRAME.test(out) || ERROR_CLASS.test(out);

  const hit = g => g.filter(k => damaged.out.includes(k));
  const said = s.speaks.filter(g => g.some(k => damaged.out.includes(k) && !healthy.out.includes(k)));
  const useless = s.speaks.filter(g => hit(g).length && hit(g).every(k => healthy.out.includes(k)));
  const missing = s.speaks.filter(g => !hit(g).length);

  const status = damaged.status;
  let state = looksLikeACrash(damaged.out) ? 'CRASH'
    : (status !== 0 && status !== 1 && status !== 2) ? 'CRASH'
      : missing.length ? 'STALE'
        : status === 2 ? 'LOUD'
          : said.length ? 'SPOKE' : 'SILENT';
  if (s.expectExit !== null && status !== s.expectExit) state = 'WRONG-EXIT';

  let detail = 'exit ' + status;
  if (state === 'WRONG-EXIT') detail += '   expected exit ' + s.expectExit;
  if (state === 'STALE')
    detail += '   never printed: ' + missing.map(g => g.map(k => JSON.stringify(k)).join(' / ')).join(', ');
  if (state === 'SPOKE') detail += '   "' + hit(said[0])[0] + '"';
  if (state === 'SILENT' && useless.length)
    detail += '   ("' + hit(useless[0])[0] + '" also printed by a healthy run)';
  rows.push({ ...s, state, detail });
}

for (const r of rows) console.log('  ' + r.state.padEnd(7) + r.name.padEnd(36) + r.detail);

const silent = rows.filter(r => r.state === 'SILENT');
const stale = rows.filter(r => r.state === 'STALE');
const wrongExit = rows.filter(r => r.state === 'WRONG-EXIT');
const crashed = rows.filter(r => r.state === 'CRASH');
const skipped = rows.filter(r => r.state === 'SKIP');
console.log('\n  ' + rows.filter(r => r.state === 'LOUD').length + ' loud, ' +
  rows.filter(r => r.state === 'SPOKE').length + ' spoke, ' + crashed.length + ' CRASH, ' +
  silent.length + ' SILENT' + (skipped.length ? ', ' + skipped.length + ' skipped' : ''));

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* denied ACLs may resist */ }

if (crashed.length) {
  console.log('\n  Crashed:');
  for (const r of crashed) console.log('    ' + r.name + ' — ' + r.damage + ', and the process died instead of saying so');
}
if (silent.length) {
  console.log('\n  Silent zeros:');
  for (const r of silent) console.log('    ' + r.name + ' — ' + r.damage + ', and nothing said');
  console.log('\n  A run that returns nothing without saying why cannot be told from a clean run.');
}
if (wrongExit.length) {
  console.log('\n  Wrong exit code:');
  for (const r of wrongExit)
    console.log('    ' + r.name + ' — a build reads that number and nothing else');
}
if (stale.length) {
  console.log('\n  Phrases that can no longer print:');
  for (const r of stale)
    console.log('    ' + r.name + ' — ' + r.detail.split('never printed: ')[1]);
  console.log('\n  A phrase nothing can produce is a phrase nobody is checking.');
}
if (silent.length || crashed.length || wrongExit.length || stale.length || ruleFailed) process.exit(1);
if (skipped.length) process.exit(2);
