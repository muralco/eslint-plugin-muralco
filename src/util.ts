import { Rule } from 'eslint';
import { Identifier, Node } from 'estree';
import { dirname, resolve } from 'path';

export const toRe = (s: string): RegExp => new RegExp(s);

const isNotNull = <T>(x: T | null): x is T => x !== null;

export interface FromInfo {
  filePath: string;
  absoluteFilePath: string;
  absoluteFileDir: string;
}

export interface ImportInfo {
  importPath: string;
  absoluteImportedPath: string;
  absoluteImportedDir: string;
}

export interface ImportRule<TOption, TSpec> {
  applySpecs: (
    specs: TSpec[],
    from: FromInfo,
    to: () => ImportInfo,
  ) => (string | null)[]; // returns the array of (generic) error messages
  resolveOptions: (opts: TOption[]) => TSpec[];
}

export const defineImportRule = <TOption, TSpec>({
  applySpecs,
  resolveOptions,
}: ImportRule<TOption, TSpec>): Rule.RuleModule['create'] => {
  let cachedOpts: TOption[] | undefined;
  let cachedSpecs: TSpec[] | undefined;

  const cachedResolveOptions = (opts: TOption[]): TSpec[] => {
    if (opts === cachedOpts && cachedSpecs) return cachedSpecs;
    cachedSpecs = resolveOptions(opts);
    return cachedSpecs;
  };

  return (context: Rule.RuleContext): Rule.RuleListener => {
    const filePath = context.getFilename();
    const absoluteFilePath = resolve(filePath);
    const absoluteFileDir = dirname(absoluteFilePath);
    const specs = cachedResolveOptions(context.options[0] as TOption[]);

    const fromInfo: FromInfo = {
      absoluteFileDir,
      absoluteFilePath,
      filePath,
    };

    const applyRule = (node: Node, importedPath: string): void => {
      const importInfo: ImportInfo = {
        importPath: importedPath,
        absoluteImportedDir: '',
        absoluteImportedPath: '',
      };

      const getImportInfo = (): ImportInfo => {
        if (importInfo.absoluteImportedPath) return importInfo;
        importInfo.absoluteImportedPath =
          importInfo.importPath[0] === '.'
            ? resolve(absoluteFileDir, importedPath)
            : importedPath;
        importInfo.absoluteImportedDir = dirname(
          importInfo.absoluteImportedPath,
        );

        return importInfo;
      };

      const failing = applySpecs(specs, fromInfo, getImportInfo).filter(
        isNotNull,
      );

      if (!failing.length) return;

      const reported: string[] = [];
      failing.forEach(message => {
        if (reported.includes(message)) return;
        reported.push(message);
        context.report({
          message: message
            .replace(/\{from\}/g, filePath)
            .replace(/\{to\}/g, importedPath),
          node,
        });
      });
    };

    return {
      ImportDeclaration: function(node): void {
        if (node.type === 'ImportDeclaration') {
          applyRule(node, node.source.value as string);
        }
      },
      CallExpression: function(node): void {
        if (
          node.type === 'CallExpression' &&
          (node.callee as Identifier).name === 'require' &&
          node.arguments[0].type === 'Literal'
        ) {
          applyRule(node, node.arguments[0].value as string);
        }
      },
    };
  };
};
