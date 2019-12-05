import { Rule } from 'eslint';
import { Node, ImportDeclaration } from 'estree';

interface ImportSpec {
  pattern: string[];
  importNode: ImportDeclaration;
}

const PATH_REGEX = /^([./]*)([^./].*)/;

const MESSAGE = 'Invalid import sorting';

const NO_RANGE = [0, 0];

const compareImports = (a: ImportSpec, b: ImportSpec): -1 | 0 | 1 => {
  if (
    (a.importNode.range || NO_RANGE)[1] + 1 !==
    (b.importNode.range || NO_RANGE)[0]
  )
    return -1;

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

        if (!broken.length) return;

        context.report({
          message: MESSAGE,
          node: broken[0].importNode,
          fix: function(fixer) {
            const sourceCode = context.getSourceCode();
            const firstBroken = broken[0];
            const swapWith = imports[imports.indexOf(firstBroken) - 1];

            const start = (swapWith.importNode.range || NO_RANGE)[0];
            const end = (firstBroken.importNode.range || NO_RANGE)[1];

            return fixer.replaceTextRange(
              [start, end],
              [
                sourceCode.getText(firstBroken.importNode),
                sourceCode.getText(swapWith.importNode),
              ].join('\n'),
            );
          },
        });
      },
    };
  },
};

export default sortedImportsRule;
