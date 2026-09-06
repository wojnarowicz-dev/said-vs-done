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
const scenario = (name, damage, build, speaks, control) =>
  SCENARIOS.push({ name, damage, build, speaks, control });

const healthySay = () => ['say', site('healthy')];

scenario('empty text directory', 'nothing to read at all',
  () => ['say', dir('empty')],
  ['No .html/.js/.md files'],
  healthySay);

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
  ['outside UTF-8', 'not valid UTF-8', 'broken.html'],
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
  ['outside UTF-8', 'not valid UTF-8', 'cp1250.html'],
  healthySay);

scenario('truncated snapshot to diff against', 'previous run cut in half',
  () => {
    const d = site('cutsnap');
    const snap = path.join(d, 'run.json');
    fs.writeFileSync(snap, '{\n  "version": 1,\n  "detector": "say",\n  "findings": [\n    {"id": "abc');
    return ['say', d, '--json', snap];
  },
  ['could not be read', 'unreadable'],
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
  ['could not be read', 'unreadable'],
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
    const who = process.env.USERNAME || process.env.USER;
    if (!who) return { skip: 'no USERNAME to deny' };
    try { execFileSync('icacls', [target, '/deny', who + ':(R)'], { stdio: 'ignore' }); }
    catch (e) { return { skip: 'icacls failed: ' + String(e.message).slice(0, 60) }; }
    try { fs.readFileSync(target); return { skip: 'icacls /deny did not actually block reading' }; }
    catch { return ['say', d]; }
  },
  ['locked.html', 'EPERM', 'EACCES', 'Cannot read'],
  healthySay);

// THE ONE THAT IS THIS TOOL'S OWN. A `done` run with no --code at all is not
// damaged input — it is a legitimate invocation whose ANSWER is narrower than
// it looks. It must say so, and the healthy run with --code must not.
scenario('coverage run with no --code', 'the scope was never stated',
  () => ['done', site('noscope')],
  ['NO --code GIVEN'],
  () => { const s = site('scoped'); return ['done', s, '--code', s, app('scoped2')]; });

console.log('said-vs-done — failure resilience\n');
const rows = [];
for (const s of SCENARIOS) {
  let args;
  try { args = s.build(); } catch (e) { args = { skip: String(e.message).slice(0, 70) }; }
  if (args && args.skip) { rows.push({ ...s, state: 'SKIP', detail: args.skip }); continue; }

  const damaged = run(args);
  const healthy = run(s.control());

  const said = s.speaks.filter(k => damaged.out.includes(k) && !healthy.out.includes(k));
  const useless = s.speaks.filter(k => damaged.out.includes(k) && healthy.out.includes(k));

  const status = damaged.status;
  const state = (status !== 0 && status !== 1 && status !== 2) ? 'CRASH'
    : status === 2 ? 'LOUD'
      : said.length ? 'SPOKE' : 'SILENT';

  let detail = 'exit ' + status;
  if (state === 'SPOKE') detail += '   "' + said[0] + '"';
  if (state === 'SILENT' && useless.length)
    detail += '   ("' + useless[0] + '" also printed by a healthy run)';
  rows.push({ ...s, state, detail });
}

for (const r of rows) console.log('  ' + r.state.padEnd(7) + r.name.padEnd(36) + r.detail);

const silent = rows.filter(r => r.state === 'SILENT');
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
if (silent.length || crashed.length) process.exit(1);
if (skipped.length) process.exit(2);
