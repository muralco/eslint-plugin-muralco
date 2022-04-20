import { Rule } from 'eslint';
import { relative } from 'path';
import { defineImportRule } from './util';

const shortImportsRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'remove useless parts of relative imports',
      category: 'Style',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        properties: {
          rejectWeird: { type: 'boolean' },
        },
        type: 'object',
      },
    ],
  },
  create: defineImportRule({
    applyRule: (from, getTo, context) => {
      const to = getTo();
      if (!to.importPath.startsWith('.')) return [];

      const absTo = to.absoluteImportedPath;
      const absFrom = from.absoluteFileDir;
      const rel = relative(absFrom, absTo);
      const path = rel.startsWith('.') ? rel : `./${rel}`;
      const weirdPath =
        context.options[0] && context.options[0].rejectWeird
          ? path.endsWith('.')
            ? `${path}/index`
            : path.endsWith('/')
            ? `${path}index`
            : path
          : path;

      if (weirdPath !== to.importPath) {
        const message =
          path === weirdPath
            ? 'This import path looks longer than it needs to be'
            : 'This import path looks weird';

        return [
          {
            message: `${message}. Replace with '${weirdPath}'`,
            fix: (fixer: Rule.RuleFixer): Rule.Fix => {
              const sourceCode = context.getSourceCode();
              const range = to.node.range || [0, 0];
              const before = sourceCode.getText(to.node);
              const after = before.replace(to.importPath, weirdPath);

              return fixer.replaceTextRange(range, after);
            },
          },
        ];
      }
      return [];
    },
  }),
};

export default shortImportsRule;
