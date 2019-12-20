import { fail } from 'assert';
import pickledCucumber, { SetupFn } from 'pickled-cucumber';
import { Linter, Rule } from 'eslint';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin: { rules: Record<string, Rule.RuleModule> } = require('./index');

const setup: SetupFn = ({
  Before,
  compare,
  Given,
  getCtx,
  setCtx,
  Then,
  When,
}) => {
  const linter = new Linter();

  Object.entries(plugin.rules).forEach(([name, rule]) =>
    linter.defineRule(name, rule),
  );

  Before(() => setCtx('$rules', {}));

  Given(
    'the "{word}" rule is enabled',
    (ruleName, value) => {
      getCtx<Linter.RulesRecord>('$rules')[ruleName] = JSON.parse(value || '2');
    },
    { optional: 'with' },
  );
  Given('the ECMA version is {int}', version =>
    setCtx('$version', Number(version)),
  );
  Given('a(?: "{word}")? file with', (fileName, payload) => {
    if (fileName) setCtx('$fileName', fileName);
    setCtx('$file', payload);
  });

  const lint = (fix: boolean): Linter.FixReport =>
    linter.verifyAndFix(
      getCtx<string>('$file'),
      {
        parserOptions: {
          ecmaVersion: getCtx('$version') || 2015,
          sourceType: 'module',
        },
        rules: getCtx<Linter.RulesRecord>('$rules'),
      },
      {
        filename: getCtx<string>('$fileName') || 'file.js',
        fix,
      },
    );

  When(
    'applying the linter',
    payload => {
      if (payload) setCtx('$file', payload);
      setCtx('$result', lint(false));
    },
    { optional: 'to' },
  );

  When(
    'linting "{word}"',
    (fileName, payload) => {
      if (payload) setCtx('$file', payload);
      setCtx('$fileName', fileName);
      setCtx('$result', lint(false));
    },
    { optional: 'with' },
  );

  const getResult = (): Linter.FixReport => getCtx<Linter.FixReport>('$result');
  Then(
    'the errors {op}',
    (op, payload) => compare(op, getResult().messages, payload),
    { inline: true },
  );
  Then('the code is OK', () => {
    compare('includes', getResult(), '{"messages":[], "fixed": false}');
  });
  Then(
    'the fixed code is',
    payload => {
      const result = lint(true);
      compare('at fixed is', result, 'true');
      compare('at output is', result, JSON.stringify(payload));
    },
    { inline: true },
  );

  const getPos = (s: string): { line: number; column: number } => {
    const lines = s.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  };

  Then(
    'an error(?: with message "([^"]+)")? is at',
    (message, payload) => {
      const startPos = payload.indexOf('>>>');
      if (startPos === -1) {
        fail(`Cannot find error marker '>>>' in:
        ${payload}
        `);
        return;
      }
      const endPos = payload.indexOf('<<<', startPos);
      if (endPos === -1) {
        fail(`Cannot find error marker '<<<' after '>>>' in:
        ${payload}
        `);
        return;
      }
      const start = getPos(payload.substring(0, startPos));
      const end = getPos(payload.substring(0, endPos).replace('>>>', ''));

      const result = getResult();
      compare(
        'includes',
        result.messages,
        JSON.stringify({
          column: start.column,
          endColumn: end.column,
          endLine: end.line,
          line: start.line,
          message,
        }),
      );
    },
    { inline: true },
  );
};

pickledCucumber(setup, { usage: true });
