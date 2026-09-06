// said-vs-done — getting client-facing text out of a project.
//
// This is the layer between the files and the dictionary. It answers one
// question: what would a customer actually READ, and where does it live?
//
// THREE SOURCES, because promises are written in three places and a tool that
// reads only one of them undercounts silently:
//
//   HTML          text nodes, plus the attributes a customer sees — <title>,
//                 meta descriptions. Legal pages keep their text right here.
//   translations  an i18n table is a JavaScript object of strings. This is
//                 where a promise made in four languages actually lives, and
//                 where the language of each string is stated by its key.
//   other code    strings hard-coded in scripts. The language is not declared,
//                 so it has to be guessed, and the guess is allowed to fail.
//
// WHAT IS NOT CLIENT-FACING, and every one of these was read as prose once:
//
//   * a CSS comment. "reszta strony zostaje na miejscu" — the page stays put —
//     matched the transmission pattern for "stays on your machine".
//   * the body of <script> and <style>. Selectors and keyframes are not copy.
//   * an HTML comment. This project documents its markup heavily; the comments
//     discuss the very sentences below them.
//
// All three are blanked out BEFORE anything else runs, and blanked with spaces
// rather than removed, so that every line number this file reports is the line
// in the file as saved.

import fs from 'node:fs';
import path from 'node:path';
import { readSource } from './input.mjs';
import { guessLanguage } from './promise.mjs';

const TEXT_FILE = /\.(html?|js|mjs|cjs|ts|mts|md)$/i;
const TRANSLATION_FILE = /(i18n|l10n|locale|messages|translations?)/i;

// ---------------------------------------------------------------- entities
//
// A short table, not a library. These are the entities that actually occur in
// this kind of copy; anything else is left as written, which is visible in the
// output rather than silently wrong.
const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…',
  laquo: '«', raquo: '»', bdquo: '„', ldquo: '“',
  rdquo: '”', sbquo: '‚', minus: '−', deg: '°',
};

export const decode = s => String(s)
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => (ENT[n.toLowerCase()] !== undefined ? ENT[n.toLowerCase()] : m));

/** Blanks a region to spaces, keeping newlines so line numbers do not drift. */
const blank = (src, re) => src.replace(re, m => m.replace(/[^\n]/g, ' '));

// ---------------------------------------------------------------- HTML
export function htmlUnits(src) {
  let s = blank(src, /<!--[\s\S]*?-->/g);
  s = blank(s, /<script\b[^>]*>[\s\S]*?<\/script>/gi);
  s = blank(s, /<style\b[^>]*>[\s\S]*?<\/style>/gi);

  const out = [];
  const lineAt = i => s.slice(0, i).split('\n').length;

  for (const m of s.matchAll(/<meta[^>]+name=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/gi))
    out.push({ line: lineAt(m.index), text: decode(m[1]), where: 'meta' });
  for (const m of s.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["'](?:description|og:description)["']/gi))
    out.push({ line: lineAt(m.index), text: decode(m[1]), where: 'meta' });
  for (const m of s.matchAll(/<title>([^<]+)<\/title>/gi))
    out.push({ line: lineAt(m.index), text: decode(m[1]), where: 'title' });

  // TEXT NODES. A tag becomes NUL, and NUL is the split point — deliberately a
  // character that cannot occur in HTML source. A space would not do: the split
  // would then fall at every word, every fragment would be under the length
  // floor below, and a file full of promises would yield a total of zero.
  //
  // Written as an escape rather than as the byte itself. A literal NUL in a
  // source file makes the file binary to grep and to half the tools that would
  // ever read it — including this project's own collector, were it ever pointed
  // at itself.
  const NUL = String.fromCharCode(0);
  s = s.replace(/<[^>]*>/g, NUL);
  let line = 1;
  for (const chunk of s.split(NUL)) {
    const t = decode(chunk).replace(/\s+/g, ' ').trim();
    if (t.length >= 12) out.push({ line, text: t, where: 'text' });
    line += (chunk.match(/\n/g) || []).length;
  }
  return out;
}

export const htmlLanguage = src => (src.match(/<html[^>]+lang=["']([a-z]{2})/i) || [])[1] || null;

// ---------------------------------------------------------------- JavaScript strings
//
// A SCANNER, NOT A REGULAR EXPRESSION, and the difference is not stylistic.
// Values in a translation table carry apostrophes ("Jeśli konto o tym adresie
// istnieje"), escaped quotes, inline HTML, and they are concatenated with `+`
// across several lines. Every regular expression tried against that file cut a
// value at the first apostrophe inside it and handed the dictionary half a
// sentence — which changes what is found without changing any count enough to
// notice.
//
// It also tracks which top-level language key it is inside, because that is
// where the language of a translated string is actually stated. Guessing it
// from the text would be a second-best answer to a question the file answers.
export function jsStrings(src) {
  const out = [];
  let i = 0, line = 1, depth = 0;
  let lang = null, langDepth = -1;
  let pendingKey = null, pendingLine = 0;

  const readString = () => {
    const q = src[i];
    let v = '';
    i++;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        const n = src[i + 1];
        v += n === 'n' ? '\n' : n === 't' ? ' ' : n === undefined ? '' : n;
        if (n === '\n') line++;
        i += 2;
        continue;
      }
      if (c === q) { i++; break; }
      if (c === '\n') line++;
      v += c; i++;
    }
    return v;
  };

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { if (depth === langDepth) { lang = null; langDepth = -1; } depth--; i++; continue; }

    if (c === '"' || c === "'" || c === '`') {
      const startLine = line;
      let v = readString();
      for (;;) {                                   // '...' + '...' + ...
        const m = src.slice(i, i + 200).match(/^\s*\+\s*(["'`])/);
        if (!m) break;
        i += m[0].length - 1;
        line += (m[0].match(/\n/g) || []).length;
        v += readString();
      }
      if (pendingKey) { out.push({ key: pendingKey, line: pendingLine || startLine, text: v, lang }); pendingKey = null; }
      continue;
    }

    const idm = src.slice(i).match(/^([A-Za-z_$][\w$]*)\s*:/);
    if (idm) {
      const name = idm[1];
      i += idm[0].length;
      if (/^(pl|en|de|es|fr|it|cs|sk|uk|ru|nl|pt)$/.test(name) && lang === null &&
        /^\s*\{/.test(src.slice(i, i + 40))) {
        lang = name; langDepth = depth + 1;
      }
      pendingKey = name; pendingLine = line;
      continue;
    }
    i++;
  }
  return out;
}

// ---------------------------------------------------------------- sentences
export const stripTags = s => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// THE DASH AND THE MIDDLE DOT ARE SENTENCE BREAKS HERE. Polish marketing copy
// joins independent clauses with " — " and " · " far more often than with a
// full stop, and treating a whole paragraph as one sentence would put a verb
// and a negation from different clauses into the same negation window.
export function sentences(text) {
  return stripTags(text)
    .split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻÄÖÜÁÉÍÓÚÑ„"«])|\s+[—–]\s+|\s+·\s+|;\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 12 && s.length <= 400);
}

// ---------------------------------------------------------------- walking
export function textFiles(root, cfg) {
  const acc = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (cfg && cfg.isExcluded(p)) continue;
      if (e.isDirectory()) { walk(p); continue; }
      if (TEXT_FILE.test(e.name)) acc.push(p);
    }
  };
  walk(root);
  return acc;
}

/**
 * Every unit of client-facing text under `root`, with its file, line and
 * language. A unit is one string as the project stores it; splitting into
 * sentences happens after, so a caller that wants the whole paragraph can have
 * it.
 */
// A FILE THAT COULD NOT BE READ IS NOT A FILE WITH NO PROMISES IN IT.
//
// `catch { continue; }` here was a silent zero of the purest kind: a page whose
// permissions denied reading contributed nothing, the totals went down, and no
// line of output said a file had been skipped. The resilience suite classified
// that run as SILENT, which is the one outcome this tool is not allowed to
// produce — "you promise less than you thought" is a comforting answer, and
// nobody double-checks a comforting answer.
//
// The read is still not fatal: one unreadable file must not stop a scan of four
// hundred. It is remembered and said out loud at the end of the run.
const unreadable = [];

export function unreadableFiles() {
  return unreadable.slice();
}

export function collect(root, cfg) {
  const files = textFiles(root, cfg);
  const units = [];

  for (const f of files) {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    let src;
    try {
      src = readSource(f);
    } catch (e) {
      if (!unreadable.some(u => u.file === f)) unreadable.push({ file: f, rel, code: e.code || e.message });
      continue;
    }

    if (/\.html?$/i.test(f)) {
      const pageLang = htmlLanguage(src);
      for (const u of htmlUnits(src)) units.push({ file: rel, ...u, lang: pageLang, key: null });
    } else if (/\.md$/i.test(f)) {
      let line = 1;
      for (const para of src.split(/\n\s*\n/)) {
        const t = para.replace(/[#*_`>|-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (t.length >= 12) units.push({ file: rel, line, text: t, lang: null, key: null, where: 'md' });
        line += (para.match(/\n/g) || []).length + 2;
      }
    } else if (TRANSLATION_FILE.test(rel)) {
      for (const u of jsStrings(src))
        units.push({ file: rel, line: u.line, text: u.text, lang: u.lang, key: u.key, where: 'i18n' });
    } else {
      // A string hard-coded in an ordinary script. THE LENGTH FLOOR IS HIGHER
      // HERE on purpose: short literals in code are selectors, class names,
      // event names and keys — never sentences addressed to a customer.
      for (const u of jsStrings(src))
        if (u.text.length >= 25 && /\s/.test(u.text.trim()))
          units.push({ file: rel, line: u.line, text: u.text, lang: null, key: u.key, where: 'code' });
    }
  }

  return { root, files: files.length, units };
}

/**
 * Sentences ready for the dictionary: language resolved, one row per sentence.
 * `lang === null` rows are counted and kept, never silently dropped — a
 * sentence whose language could not be established is a sentence nothing was
 * asked about, and that has to be visible in the totals.
 */
export function sentenceRows(collected) {
  const rows = [];
  let unknown = 0;
  for (const u of collected.units) {
    for (const s of sentences(u.text)) {
      const lang = u.lang || guessLanguage(s);
      if (!lang) { unknown++; continue; }
      rows.push({ file: u.file, line: u.line, key: u.key, where: u.where, lang, sentence: s });
    }
  }
  return { rows, unknown };
}
