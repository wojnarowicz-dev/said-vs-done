// said-vs-done — the help screen.
//
// A SEPARATE FILE, because help is the only output a person reads BEFORE
// deciding whether to run the tool a second time, and it is the output most
// likely to bypass the dictionary and ship in the author's own language.
import { t } from '../src/lang.mjs';

export function help(COMMANDS, code = 0) {
  const w = code === 0 ? console.log : console.error;

  w(t('helpTagline'));
  w('');
  w(t('helpPrinciple'));
  w('');
  w(t('helpUsage'));
  w('  said-vs-done <command> [arguments]');
  w('');
  w(t('helpLangSec'));
  w(t('helpLangEn'));
  w(t('helpLangPl'));
  w('');
  w(t('helpCommands'));
  for (const [name, c] of Object.entries(COMMANDS)) {
    w('  ' + name.padEnd(5) + c.arg);
    w('        ' + t(c.descKey));
    if (c.options) w(t('helpOptions', c.options));
  }
  w('');
  w(t('helpExamples'));
  w('  npx said-vs-done say  ./src/web');
  w('  npx said-vs-done done ./src/web --code . ../TheProgram');
  w('  npx said-vs-done done ./src/web --code . ../TheProgram --only no-witness');
  w('  npx said-vs-done diff old.json new.json');
  w('');
  w(t('helpScopeWarn'));

  process.exit(code);
}
