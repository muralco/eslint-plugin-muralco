import { Rule } from 'eslint';
import { Node, ImportDeclaration } from 'estree';

interface ImportNode {
  pattern: string[];
  importNode: ImportDeclaration;
}

const PATH_REGEX = /^([./]*)([^./].*)/;

const MESSAGE = 'Invalid import sorting';

const NO_RANGE = [0, 0];

const compareImports = (a: ImportNode, b: ImportNode): -1 | 0 | 1 => {
  const [aPrefix, aSuffix] = a.pattern;
  const [bPrefix, bSuffix] = b.pattern;

  if (aPrefix && bPrefix) {
    if (aPrefix.length > bPrefix.length) return -1;
    if (aPrefix.length < bPrefix.length) return 1;
    return aSuffix <= bSuffix ? -1 : 1;
  }
  if (aPrefix) return 1;
  if (bPrefix) return -1;
  return aSuffix <= bSuffix ? -1 : 1;
};

const getPattern = (value: string): string[] =>
  (value.match(PATH_REGEX) || ['', '', value]).slice(1);

const isImportDeclaration = (n: Node): n is ImportDeclaration =>
  n.type === 'ImportDeclaration';

const sortedImportsRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'sort imports from more generic to more specific',
      category: 'Style',
      recommended: false,
      url: 'https://eslint.org/docs/rules/no-extra-semi',
    },
    fixable: 'code',
    schema: [], // no options
  },
  create: function(context) {
    return {
      Program: function(node): void {
        if (node.type !== 'Program') return;
        const imports = node.body
          .filter(isImportDeclaration)
          .map(importNode => ({
            importNode,
            pattern: getPattern(`${importNode.source.value}`),
          }));
        const broken = imports
          .slice(1)
          .filter((n, i) => compareImports(imports[i], n) === 1);

        if (broken.length) {
          const start = (imports[0].importNode.range || NO_RANGE)[0];
          const end = (imports[imports.length - 1].importNode.range ||
            NO_RANGE)[1];
          const sourceCode = context.getSourceCode();

          context.report({
            message: MESSAGE,
            loc: {
              start: sourceCode.getLocFromIndex(start),
              end: sourceCode.getLocFromIndex(end),
            },
            fix: function(fixer) {
              const sortedImports = imports
                .sort(compareImports)
                .map(i => sourceCode.getText(i.importNode))
                .join('\n');
              return fixer.replaceTextRange([start, end], sortedImports);
            },
          });
        }
      },
    };
  },
};

module.exports = {
  configs: {
    recommended: {
      plugins: ['muralco'],
      rules: {
        'muralco/sorted-imports': 'error',
      },
    },
  },
  rules: {
    'sorted-imports': sortedImportsRule,
  },
};
