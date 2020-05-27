import { Rule } from 'eslint';

const customJsxRule: Rule.RuleModule = {
  create: function(context) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      JSXOpeningElement: function(node: any): void {
        if (node.name.name) {
          const variable = node.name.name;
          context.markVariableAsUsed(variable);
        }
      },
    };
  },
};

export default customJsxRule;
