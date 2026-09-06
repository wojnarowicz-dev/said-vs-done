#!/usr/bin/env node
// said-vs-done — a single entry point for both stages.
//
// Each stage is a module that reads process.argv on import. The dispatcher
// swaps argv and imports the right one — which keeps the stages runnable on
// their own (`node src/say.mjs ...`) as well as through this command.
//
// PATHS BECOME URLS THROUGH pathToFileURL, never by string concatenation. On
// Windows a path is `C:\Users\...`, and `'file://' + p` produces
// `file://C:\Users\...`, which Node rejects with ERR_UNSUPPORTED_ESM_URL_SCHEME
// — the drive letter is read as the scheme. Every hand-rolled version of this
// needs a backslash replacement to work, and that replacement is exactly the
// kind of thing that survives a copy-paste into a shell one backslash lighter.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { t } from '../src/lang.mjs';
import { firstPositional } from '../src/args.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const mod = f => pathToFileURL(path.join(SRC, f)).href;

const COMMANDS = {
  say: {
    module: 'say.mjs',
    arg: '<text-dir>',
    descKey: 'cmdSay',
    options: '--tier sure|edge  --area deletion  --top 40  --json <file>',
  },
  done: {
    module: 'done.mjs',
    arg: '<text-dir> --code <repo> [<repo>...]',
    descKey: 'cmdDone',
    options: '--tier sure|all  --only no-witness  --area deletion  --top 40  --json <file>',
  },
  diff: {
    module: null,
    arg: '<previous.json> <current.json>',
    descKey: 'cmdDiff',
    options: '--all (also show unchanged promises)',
  },
};

const { help } = await import(new URL('./usage.mjs', import.meta.url).href);
const usage = (code = 0) => help(COMMANDS, code);

const [cmd, ...rest] = process.argv.slice(2);

if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') usage(0);
if (cmd === '--version' || cmd === '-v') {
  const { createRequire } = await import('node:module');
  console.log(createRequire(import.meta.url)('../package.json').version);
  process.exit(0);
}
if (!COMMANDS[cmd]) {
  console.error(t('unknownCommand', cmd));
  console.error('');
  usage(2);
}
if (rest.length === 0) {
  console.error(t('inputMissingArg', cmd + ' ' + COMMANDS[cmd].arg));
  process.exit(2);
}

if (cmd === 'diff') {
  const { readSnapshot, printDiff } = await import(mod('snapshot.mjs'));
  // `--lang` eats the token after it; without this its value joins the file list.
  const files = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--lang') { i++; continue; }
    if (rest[i].startsWith('--')) continue;
    files.push(rest[i]);
  }
  if (files.length !== 2) {
    console.error(t('diffNeedsTwo'));
    process.exit(2);
  }
  const d = printDiff(readSnapshot(files[0]), readSnapshot(files[1]),
    { showUnchanged: rest.includes('--all') });
  process.exit(d.added.length ? 1 : 0);
}

// INPUT VALIDATION — one place, before anything runs. A mistyped path must not
// arrive as a Node stack trace that reads like the tool crashed.
{
  const { requireDirectory } = await import(mod('input.mjs'));
  requireDirectory(firstPositional(rest), COMMANDS[cmd].arg);
  if (cmd === 'done') {
    const { flagAll } = await import(mod('args.mjs'));
    // EVERY --code PATH IS CHECKED, and a bad one is fatal rather than skipped.
    // A typo in one of several repositories would otherwise drop it from the
    // search in silence, and the result would be the very false alarm this
    // stage exists to avoid: promises reported unkept because the code that
    // keeps them was never read.
    for (const c of flagAll(rest, 'code')) requireDirectory(c, '--code <repo>');
  }
}

process.argv = [process.argv[0], path.join(SRC, COMMANDS[cmd].module), ...rest];
await import(mod(COMMANDS[cmd].module));
