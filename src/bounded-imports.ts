import { Rule } from 'eslint';
import { defineImportRule } from './util';

const boundedImportsRule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'reject imports that include a specific string',
      category: 'Style',
      recommended: false,
    },
    schema: [
      {
        items: { type: 'string' },
        required: true,
        type: 'array',
      },
    ],
  },
  create: defineImportRule({
    applyRule: (_, getTo, context) => {
      context.options[0];
      const path = getTo().importPath;
      const reject = context.options[0].filter((p: string) => path.includes(p));

      if (reject.length) return [`Imports cannot contain ${reject.join(', ')}`];
      return [];
    },
  }),
};

export default boundedImportsRule;
