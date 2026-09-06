// said-vs-done — all ten layers, in order of how loudly they fail.
//
// ONE RUNNER, NOT TEN COMMANDS, because a suite people have to remember to run
// is a suite that stops being run. Each layer keeps its own exit code, and the
// summary distinguishes the three outcomes that must never look alike:
//
//   passed    the layer ran and everything held
//   FAILED    the layer ran and something is wrong           -> exit 1
//   skipped   the layer could not reach its material         -> exit 2
//
// The order is deliberate. The cheap structural checks run first, so a broken
// dictionary is reported in a second rather than after two minutes of scanning
// real repositories.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const LAYERS = [
  ['lexicon', 'the four languages are four languages'],
  ['lang-check', 'the two message languages are two languages'],
  ['negative', 'what must not be read as a promise'],
  ['golden', 'recorded runs, field by field'],
  ['amplify', 'the output depends on the input'],
  ['scope', 'an unstated scope is not a finding'],
  ['evidence', 'every citation is real'],
  ['resilience', 'fail loudly, never quietly'],
  ['readme', 'the README agrees with the tool'],
  ['known-answers', 'the three hand-traced answers'],
];

const rows = [];
for (const [name, what] of LAYERS) {
  const r = spawnSync(process.execPath, [path.join(HERE, name + '.mjs')],
    { encoding: 'utf8', maxBuffer: 1e9 });
  const out = (r.stdout || '') + (r.stderr || '');
  rows.push({ name, what, status: r.status, out });
  const state = r.status === 0 ? 'pass' : r.status === 2 ? 'SKIP' : 'FAIL';
  console.log(state.padEnd(6) + name.padEnd(16) + what);
  if (r.status !== 0) {
    for (const line of out.trim().split(/\r?\n/).slice(-6)) console.log('       ' + line);
  }
}

const failed = rows.filter(r => r.status === 1);
const skipped = rows.filter(r => r.status === 2);
console.log('\n' + (rows.length - failed.length - skipped.length) + ' passed, ' +
  failed.length + ' failed' + (skipped.length ? ', ' + skipped.length + ' skipped' : '') +
  '   (' + rows.length + ' layers)');

if (failed.length) process.exit(1);
if (skipped.length) {
  console.log('\nA layer that could not reach its material is not a passing layer.');
  process.exit(2);
}
