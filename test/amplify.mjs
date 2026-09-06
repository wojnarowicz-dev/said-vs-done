// said-vs-done — layer 4: amplification.
//
// WHAT THIS ADDS OVER THE GOLDEN TESTS. Golden tests pin one output for one
// input. They prove the tool still says the same thing; they do not prove it
// says anything ABOUT the input. A collector hard-wired to report exactly
// seventeen findings from test/fixtures/site would pass every golden test in
// this repository.
//
// So each case perturbs the fixture in a way whose consequence is known in
// advance, and the result must move accordingly:
//
//   * remove a promise from the text          -> the count must drop
//   * add one                                 -> the count must rise
//   * remove the code that keeps a promise    -> covered must become no-witness
//   * translate a promise into a fourth lang  -> the count must rise by one
//
// EVERY CASE IS ITS OWN NEGATIVE CHECK. A perturbation whose result does not
// move is a failure even when the tool "worked": it means the output does not
// depend on the thing that was changed, and a test that cannot tell the
// difference is measuring its own echo.
//
// The fixtures themselves are never touched: every case works on a copy.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { findPromises } from '../src/say.mjs';
import { checkCoverage } from '../src/done.mjs';
import { loadConfig } from '../src/config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, 'fixtures');
const CONFIG = path.join(FIX, 'golden.config.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'svd-amp-'));

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyTree(a, b); else fs.copyFileSync(a, b);
  }
  return to;
}

let n = 0;
const fresh = (label) => {
  const d = path.join(TMP, label + '-' + (++n));
  copyTree(path.join(FIX, 'site'), path.join(d, 'site'));
  copyTree(path.join(FIX, 'app'), path.join(d, 'app'));
  return { site: path.join(d, 'site'), app: path.join(d, 'app') };
};

const edit = (file, from, to) => {
  const s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) throw new Error('perturbation did not apply: ' + from.slice(0, 50));
  fs.writeFileSync(file, s.replace(from, to));
};

const cfg = (root) => loadConfig(['--config', CONFIG], root);
const sureCount = (root) => findPromises(root, cfg(root)).promises.filter(p => p.tier === 'sure').length;
const verdictsOf = (site, roots) => {
  const { judged } = checkCoverage(site, roots, cfg(site));
  const m = {};
  for (const j of judged) m[j.verdict.verdict] = (m[j.verdict.verdict] || 0) + 1;
  return m;
};

const rows = [];
const record = (name, expected, actual, ok) => rows.push({ name, expected, actual, ok });

console.log('said-vs-done — amplification\n');

const base = fresh('base');
const BASE_SURE = sureCount(base.site);
const BASE_VERDICTS = verdictsOf(base.site, [base.site, base.app]);

// ---- 1. remove a promise from the text
{
  const d = fresh('removed');
  edit(path.join(d.site, 'privacy.html'),
    '<p>Nie udostępniamy Twoich danych nikomu.</p>', '<p>Dane są danymi.</p>');
  const got = sureCount(d.site);
  record('removing a promise lowers the count', '< ' + BASE_SURE, got, got < BASE_SURE);
}

// ---- 2. add one
{
  const d = fresh('added');
  edit(path.join(d.site, 'privacy.html'),
    '<p>Systemy i programy to nie problemy.</p>',
    '<p>Systemy i programy to nie problemy.</p>\n  <p>Szyfrujemy każdy plik przed zapisem.</p>');
  const got = sureCount(d.site);
  record('adding a promise raises the count', '> ' + BASE_SURE, got, got > BASE_SURE);
}

// ---- 3. a fourth translation of an existing promise
//
// This is the case that separates "counts sentences" from "counts sentences per
// language". A tool keyed on the i18n key alone would not move here.
{
  const d = fresh('translated');
  edit(path.join(d.site, 'js', 'i18n-fixture.js'),
    "        participle: 'No se ha enviado ninguna incidencia desde esta cuenta.'",
    "        participle: 'No se ha enviado ninguna incidencia desde esta cuenta.',\n" +
    "        extra: 'Ciframos tus datos antes de guardarlos.'");
  const got = sureCount(d.site);
  record('a new translation raises the count', BASE_SURE + 1, got, got === BASE_SURE + 1);
}

// ---- 4. remove the witness: covered must fall
{
  const d = fresh('nowitness');
  edit(path.join(d.app, 'migrations.sql'),
    "  delete from public.reports\n   where created_at < now() - interval '30 days';",
    '  return 0;');
  const got = verdictsOf(d.site, [d.site, d.app]);
  const ok = (got.covered || 0) < (BASE_VERDICTS.covered || 0);
  record('removing the delete lowers `covered`',
    '< ' + (BASE_VERDICTS.covered || 0), got.covered || 0, ok);
}

// ---- 5. change the interval: the number must stop matching
//
// THE CASE THE TOOL WAS BUILT FOR. The delete still exists; it deletes after a
// different number of days than the text promises. A witness check that only
// asked "is there a delete" would call this kept.
{
  const d = fresh('wrongnumber');
  edit(path.join(d.app, 'migrations.sql'), "interval '30 days'", "interval '365 days'");
  const { judged } = checkCoverage(d.site, [d.site, d.app], cfg(d.site));
  const thirty = judged.filter(j => /\b30\b/.test(j.promise.sentence) && j.promise.area === 'deletion');
  const stillCovered = thirty.filter(j => j.verdict.verdict === 'covered');
  record('a delete with the wrong interval is not coverage',
    '0 of ' + thirty.length + ' covered', stillCovered.length + ' covered',
    thirty.length > 0 && stillCovered.length === 0);
}

// ---- 6. the control: an untouched copy must not move
//
// Without this, a perturbation harness that broke the fixture copy entirely
// would report every case as "the count moved" and pass.
{
  const d = fresh('control');
  const got = sureCount(d.site);
  record('an untouched copy does not move', BASE_SURE, got, got === BASE_SURE);
}

for (const r of rows)
  console.log('  ' + (r.ok ? 'PASS  ' : 'FAIL  ') + r.name.padEnd(46) +
    'expected ' + String(r.expected).padEnd(14) + 'got ' + r.actual);

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

const bad = rows.filter(r => !r.ok);
console.log('\n  ' + (rows.length - bad.length) + ' passed, ' + bad.length + ' failed');
if (bad.length) {
  console.log('\n  A result that does not move when the input does is measuring its own echo.');
  process.exit(1);
}
