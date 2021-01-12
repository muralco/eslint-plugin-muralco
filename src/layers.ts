import { Rule } from 'eslint';
import { dirname, resolve } from 'path';

interface LayerOption {
  allowChildren?: boolean;
  except?: string[];
  from: string;
  message?: string;
  to: string[];
}

interface LayerSpec {
  allowChildren: boolean;
  except: RegExp[];
  from: RegExp;
  message: string;
  to: RegExp[];
}

const toRe = (s: string): RegExp => new RegExp(s);

const MESSAGE =
  'A file from layer `{from}` cannot import a file from layer `{to}`';

let cachedOpts: LayerOption[] | undefined;
let cachedSpecs: LayerSpec[] | undefined;

const resolveOptions = (opts: LayerOption[]): LayerSpec[] => {
  if (opts === cachedOpts && cachedSpecs) return cachedSpecs;
  cachedSpecs = opts.map(opt => ({
    allowChildren: opt.allowChildren !== false,
    except: opt.except ? opt.except.map(toRe) : [],
    from: toRe(opt.from),
    message: opt.message || MESSAGE,
    to: opt.to.map(toRe),
  }));
  cachedOpts = opts;
  return cachedSpecs;
};

const layersRule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'sort imports from more generic to more specific',
      category: 'Style',
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
  create: function(context) {
    const filePath = context.getFilename();
    const absoluteFilePath = resolve(filePath);
    const absoluteFileDir = dirname(absoluteFilePath);
    const specs = resolveOptions(context.options[0] as LayerOption[]);

    return {
      ImportDeclaration: function(node): void {
        if (node.type !== 'ImportDeclaration') return;
        const importedPath = node.source.value as string;
        const absoluteImportedPath =
          importedPath[0] === '.'
            ? resolve(absoluteFileDir, importedPath)
            : importedPath;

        const matching = specs.filter(s => absoluteFilePath.match(s.from));

        if (!matching.length) {
          return;
        }

        const isChild =
          absoluteImportedPath.includes(absoluteFileDir) ||
          absoluteFilePath.includes(dirname(absoluteImportedPath)) ||
          matching.some(s => absoluteImportedPath.match(s.from));

        const failing = matching.filter(
          s =>
            (!isChild || !s.allowChildren) &&
            // The path does not match any of the allowed patterns
            (!s.to.some(r => absoluteImportedPath.match(r)) ||
              // The path matches some of the rejected patterns
              s.except.some(r => absoluteImportedPath.match(r))),
        );

        if (!failing.length) return;

        const reported: string[] = [];
        failing.forEach(s => {
          if (reported.includes(s.message)) return;
          reported.push(s.message);
          context.report({
            message: s.message
              .replace('{from}', filePath)
              .replace('{to}', importedPath),
            node,
          });
        });
      },
    };
  },
};

export default layersRule;
