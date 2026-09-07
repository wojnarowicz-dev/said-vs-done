// said-vs-done — exclusions and mutes.
//
// TAKEN FROM odd-one-out, not rewritten. The two tools share this layer
// verbatim on purpose: a second implementation of it would be a second place
// to fix, and the difference between the tools is in what they MEASURE, not
// in how they read a flag or write a run to disk.
//
// TWO DIFFERENT THINGS, deliberately kept apart:
//
//   exclude  — what NOT TO READ. It affects the population, so it also changes
//              the pattern: excluding tests can raise or lower conventionality.
//   mute     — what NOT TO SHOW. The site is read and counted towards the
//              population, it just does not reach the report or the ranking.
//
// Confusing the two corrupts results silently: a mute implemented as an
// exclusion removes the site from the population and weakens the very rule that
// caught it.
//
// A default list is built in so the tool works with no configuration. An
// `.said-vs-done.json` file in the scanned directory (or one given via --config)
// adds to it; `"exclude"` replaces the defaults only when
// `"excludeDefaults": false` is given.
import fs from 'node:fs';
import path from 'node:path';
import { t } from './lang.mjs';
import { valueOf } from './args.mjs';

export const DEFAULT_EXCLUDE = [
  '**/build/**', '**/target/**', '**/out/**', '**/dist/**',
  '**/node_modules/**', '**/.git/**', '**/.idea/**',
  '**/generated/**', '**/coverage/**',
  // A BUILD OUTPUT IS THE SAME PROMISE COUNTED TWICE. The first project this was
  // run against kept a compiled copy of the whole site under out/production/ —
  // and a copy of that copy inside itself. Without these the run counted every
  // sentence five times and the total claimed far more promises than were ever
  // written. '**/out/**' above catches that one; these are the other shapes the
  // same mistake takes.
  '**/main_extracted/**', '**/vendor/**', '**/*.min.js', '**/*.bundle.js',
  // ONCE .json IS READ, THESE ARE PROSE. A lock file is a hundred thousand
  // strings of versions and hashes; a compiler config is machine settings; and
  // this tool's own run snapshots hold every promise it has ever found,
  // verbatim, so a second run over the same directory would read its own output
  // back in and count each promise twice. That last one is not hypothetical —
  // it is the build-output mistake above, wearing the tool's own name.
  '**/package-lock.json', '**/composer.lock', '**/*.lock.json',
  '**/tsconfig*.json', '**/.said-vs-done/**', '**/.said-vs-done.json',
];

export const CONFIG_NAME = '.said-vs-done.json';

// A minimal pattern matcher: ** (any segments), * (within one segment).
// Deliberately no library — this is a dozen lines, and every dependency in a
// tool meant to survive `npm i -g` has a cost.
const META = '.+^${}()|[]\\';
function toRegExp(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') { i++; out += '(?:.*/)?'; }  // **/ = zero lub wiecej segmentow
        else out += '.*';
      } else {
        out += '[^/]*';                                          // * = w obrebie jednego segmentu
      }
    } else if (META.includes(c)) {
      out += '\\' + c;
    } else {
      out += c;
    }
  }
  return new RegExp('^' + out + '$');
}

export function loadConfig(argv = [], root = process.cwd()) {
  const explicit = valueOf(argv, 'config');

  let file = explicit;
  if (!file) {
    for (const dir of [root, process.cwd()]) {
      try {
        const p = path.join(dir, CONFIG_NAME);
        if (fs.existsSync(p)) { file = p; break; }
      } catch { /* katalog moze nie istniec */ }
    }
  }

  let raw = {};
  if (file) {
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(t('configUnreadable', file, e.message));
      console.error(t('configFallback'));
      raw = {};
      file = null;
    }
  }

  const useDefaults = raw.excludeDefaults !== false;
  const exclude = [...(useDefaults ? DEFAULT_EXCLUDE : []), ...(raw.exclude || [])];
  const regexes = exclude.map(toRegExp);

  // mute: a list of finding ids, or objects {id, reason}
  const mute = new Map();
  for (const m of raw.mute || []) {
    if (typeof m === 'string') mute.set(m, '');
    else if (m && m.id) mute.set(m.id, m.reason || '');
  }

  const norm = p => String(p).replace(/\\/g, '/');
  const fileLinesCache = new Map();   // pathArg -> lines pliku (albo null, gdy nieczytelny)

  return {
    file,
    exclude,
    mute,
    /** whether to skip this path while READING */
    isExcluded(p) {
      const s = norm(p);
      return regexes.some(r => r.test(s));
    },
    /** whether a finding with this id is hidden IN THE REPORT (population stays) */
    isMuted(id) {
      return mute.has(id);
    },
    /**
     * Muting with a COMMENT in the code: `<!-- said-vs-done: ok — reason -->`.
     *
     * A mute file is good for bulk decisions, but it forces you to jump between
     * the code and the configuration, and it records a fingerprint that cannot
     * be read in place. A comment stands where the decision was made and travels
     * with the code through moves and merges.
     *
     * We look at the finding's own line and the line ABOVE it — both forms are
     * natural:
     *     <p>We reply within a day.</p>  <!-- said-vs-done: ok — not a promise -->
     *     <!-- said-vs-done: ok — as above -->
     *     <p>We reply within a day.</p>
     */
    mutedByComment(absFile, line) {
      if (!absFile || !line) return null;
      let lines = fileLinesCache.get(absFile);
      if (lines === undefined) {
        try { lines = fs.readFileSync(absFile, 'utf8').split(/\r?\n/); }
        catch { lines = null; }
        fileLinesCache.set(absFile, lines);
      }
      if (!lines) return null;
      for (const nr of [line - 1, line - 2]) {
        const content = lines[nr];
        if (!content) continue;
        const m = content.match(/said-vs-done:\s*ok\b[ \t]*[—:-]?[ \t]*(.*)$/i);
        if (m) return (m[1] || '').replace(/\s*(\*\/|-->)\s*$/, '').trim() || t('noReason');
      }
      return null;
    },
    muteReason(id) {
      return mute.get(id) || '';
    },
    describe() {
      return t('exclusions', exclude.length) +
        (this.file ? ' (config: ' + norm(this.file) + ')' : t('defaults')) +
        (mute.size ? t('mutes', mute.size) : '');
    },
  };
}
