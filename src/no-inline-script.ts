import { Rule } from 'eslint';
import { Node, CallExpression } from 'estree';
import { getStringIfConstant } from 'eslint-utils';

const noInlineScript: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the injection of scripts to the HTML directly',
      category: 'Security',
      recommended: false,
    },
    messages: {
      noInlineScript: 'Adding scripts to HTML directly is not allowed',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression(n: Node) {
        const node = n as CallExpression;
        const report = () =>
          context.report({
            node,
            messageId: 'noInlineScript',
          });

        // We only take care of `createElement` calls
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'createElement'
        ) {
          // If the first argument is the literal 'script'
          // E.g: createElement('script')
          if (
            node.arguments[0] &&
            node.arguments[0].type === 'Literal' &&
            String(node.arguments[0].value).toLowerCase() === 'script'
          ) {
            report();
          }
          // Or it is a variable that has a value of 'script'
          // E.g: createElement(myVar) // Where myVar === 'script'
          if (
            node.arguments[0] &&
            node.arguments[0].type === 'Identifier' &&
            getStringIfConstant(
              node.arguments[0],
              context.getScope(),
            )?.toLowerCase() === 'script'
          ) {
            report();
          }
        }
      },
    };
  },
};

export default noInlineScript;
