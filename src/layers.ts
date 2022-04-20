import { Rule } from 'eslint';
import { defineImportSpecRule, toRe } from './util';

interface LayerOption {
  allowChildren?: boolean;
  except?: string[];
  from?: string;
  message?: string;
  to: string[];
}

interface LayerSpec {
  allowChildren: boolean;
  except: RegExp[];
  from: RegExp | null;
  message: string;
  to: RegExp[];
}

const MESSAGE =
  'A file from layer `{from}` cannot import a file from layer `{to}`';

const layersRule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'enforce layer abstraction',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [
      {
        items: {
          properties: {
            allowChildren: { type: 'boolean' },
            from: { type: 'string', required: true },
            message: { type: 'string' },
            to: { type: 'array', items: { type: 'string' }, required: true },
          },
          type: 'object',
        },
        required: true,
        type: 'array',
      },
    ],
    type: 'suggestion',
  },
  create: defineImportSpecRule<LayerOption, LayerSpec>({
    applySpecs: (specs, from, getTo) =>
      specs.map(spec => {
        //  does not apply
        if (spec.from && !from.absoluteFilePath.match(spec.from)) return null;

        const to = getTo();

        const isChild =
          to.absoluteImportedPath.includes(from.absoluteFileDir) ||
          from.absoluteFilePath.includes(to.absoluteImportedDir);

        const isValid =
          (spec.allowChildren &&
            (isChild ||
              (!!spec.from && !!to.absoluteImportedPath.match(spec.from)))) ||
          // The path matches any of the allowed patterns
          (spec.to.some(r => to.absoluteImportedPath.match(r)) &&
            // The path does not match some of the rejected patterns
            !spec.except.some(r => to.absoluteImportedPath.match(r)));

        return isValid ? null : spec.message;
      }),
    resolveOptions: opts =>
      opts.map(opt => ({
        allowChildren: opt.allowChildren !== false,
        except: opt.except ? opt.except.map(toRe) : [],
        from: !opt.from || opt.from === '.*' ? null : toRe(opt.from),
        message: opt.message || MESSAGE,
        to: opt.to.map(toRe),
      })),
  }),
};

export default layersRule;
