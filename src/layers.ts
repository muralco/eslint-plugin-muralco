import { Rule } from 'eslint';
import { dirname, resolve } from 'path';

interface LayerOption {
  allowChildren?: boolean;
  from: string;
  message?: string;
  to: string[];
}

interface LayerSpec {
  allowChildren: boolean;
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
          absoluteFilePath.includes(dirname(absoluteImportedPath));

        const failing = matching.filter(
          s =>
            (!isChild || !s.allowChildren) &&
            s.to.every(r => !absoluteImportedPath.match(r)),
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
