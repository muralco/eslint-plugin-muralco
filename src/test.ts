import { fail } from 'assert';
import pickledCucumber, { SetupFn } from 'pickled-cucumber';
import { Linter, Rule } from 'eslint';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin: { rules: Record<string, Rule.RuleModule> } = require('./index');

const setup: SetupFn = ({
  compare,
  Given,
  getCtx,
  pushCtx,
  setCtx,
  Then,
  When,
}) => {
  const linter = new Linter();

  Object.entries(plugin.rules).forEach(([name, rule]) =>
    linter.defineRule(name, rule),
  );

  Given('the "{word}" rule is enabled', ruleName => {
    linter.defineRule(ruleName, plugin.rules[ruleName]);
    pushCtx('$rules', ruleName);
  });
  Given('the ECMA version is {int}', version =>
    setCtx('$version', Number(version)),
  );
  Given('a file with', payload => setCtx('$file', payload));

  const lint = (fix: boolean): Linter.FixReport =>
    linter.verifyAndFix(
      getCtx<string>('$file'),
      {
        parserOptions: {
          ecmaVersion: getCtx('$version') || 2015,
          sourceType: 'module',
        },
        rules: (getCtx<string[]>('$rules') || []).reduce((acc, name) => {
          acc[name] = 2;
          return acc;
        }, {} as Record<string, 2>),
      },
      {
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
    'an error is at',
    payload => {
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
          line: start.line,
          column: start.column,
          endLine: end.line,
          endColumn: end.column,
        }),
      );
    },
    { inline: true },
  );
};

pickledCucumber(setup, { usage: true });
