import { Rule } from 'eslint';
import { Node, ImportDeclaration } from 'estree';

interface ImportSpec {
  pattern: string[];
  importNode: ImportDeclaration;
}

const PATH_REGEX = /^([./]*)([^./].*)/;

const MESSAGE = 'Invalid import sorting';

const NO_RANGE = [0, 0];

const comesRightAfter = (a: ImportSpec, b: ImportSpec): boolean =>
  (a.importNode.range || NO_RANGE)[1] + 1 ===
  (b.importNode.range || NO_RANGE)[0];

const compareImports = (a: ImportSpec, b: ImportSpec): -1 | 0 | 1 => {
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

const compareConsecutiveImports = (
  a: ImportSpec,
  b: ImportSpec,
): -1 | 0 | 1 => {
  if (!comesRightAfter(a, b)) return -1;
  return compareImports(a, b);
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
          .filter((n, i) => compareConsecutiveImports(imports[i], n) === 1);

        if (!broken.length) return;

        context.report({
          message: MESSAGE,
          node: broken[0].importNode,
          fix: function(fixer) {
            const sourceCode = context.getSourceCode();
            const firstBroken = broken[0];
            const lastBroken = broken
              .slice(1)
              .reduce((a, b) => (comesRightAfter(a, b) ? b : a), firstBroken);
            const swapWith = imports[imports.indexOf(firstBroken) - 1];

            const start = (swapWith.importNode.range || NO_RANGE)[0];
            const end = (lastBroken.importNode.range || NO_RANGE)[1];

            const sorted = [
              swapWith,
              ...broken.slice(0, broken.indexOf(lastBroken) + 1),
            ]
              .sort(compareImports)
              .map(n => sourceCode.getText(n.importNode))
              .join('\n');

            return fixer.replaceTextRange([start, end], sorted);
          },
        });
      },
    };
  },
};

export default sortedImportsRule;
