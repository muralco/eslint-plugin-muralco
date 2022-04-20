import { Rule } from 'eslint';
import { CallExpression, Identifier, ImportDeclaration } from 'estree';
import { dirname, resolve } from 'path';

export const toRe = (s: string): RegExp => new RegExp(s);

const isNotNull = <T>(x: T | null): x is T => x !== null;

export interface FromInfo {
  filePath: string;
  absoluteFilePath: string;
  absoluteFileDir: string;
}

type ImportNode = ImportDeclaration | CallExpression;

export interface ImportInfo {
  importPath: string;
  absoluteImportedPath: string;
  absoluteImportedDir: string;
  node: ImportNode;
}

type ImportError =
  | string
  | { message: string; fix: (fixer: Rule.RuleFixer) => Rule.Fix }
  | null;

export interface ImportRule {
  applyRule: (
    from: FromInfo,
    getTo: () => ImportInfo,
    context: Rule.RuleContext,
  ) => ImportError[];
}

export const defineImportRule = ({
  applyRule,
}: ImportRule): Rule.RuleModule['create'] => {
  return (context: Rule.RuleContext): Rule.RuleListener => {
    const filePath = context.getFilename();
    const absoluteFilePath = resolve(filePath);
    const absoluteFileDir = dirname(absoluteFilePath);

    const fromInfo: FromInfo = {
      absoluteFileDir,
      absoluteFilePath,
      filePath,
    };

    const applyRuleInternal = (
      node: ImportNode,
      importedPath: string,
    ): void => {
      const importInfo: ImportInfo = {
        importPath: importedPath,
        absoluteImportedDir: '',
        absoluteImportedPath: '',
        node,
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

      const failing = applyRule(fromInfo, getImportInfo, context).filter(
        isNotNull,
      );

      if (!failing.length) return;

      const reported: string[] = [];
      failing.forEach(error => {
        const message = typeof error === 'string' ? error : error.message;

        if (reported.includes(message)) return;
        reported.push(message);
        context.report({
          fix: typeof error === 'string' ? undefined : error.fix,
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
          applyRuleInternal(node, node.source.value as string);
        }
      },
      CallExpression: function(node): void {
        if (
          node.type === 'CallExpression' &&
          (node.callee as Identifier).name === 'require' &&
          node.arguments[0].type === 'Literal'
        ) {
          applyRuleInternal(node, node.arguments[0].value as string);
        }
      },
    };
  };
};

export interface ImportSpecRule<TOption, TSpec> {
  applySpecs: (
    specs: TSpec[],
    from: FromInfo,
    to: () => ImportInfo,
  ) => (string | null)[]; // returns the array of (generic) error messages
  resolveOptions: (opts: TOption[]) => TSpec[];
}

export const defineImportSpecRule = <TOption, TSpec>({
  applySpecs,
  resolveOptions,
}: ImportSpecRule<TOption, TSpec>): Rule.RuleModule['create'] => {
  let cachedOpts: TOption[] | undefined;
  let cachedSpecs: TSpec[] | undefined;

  const cachedResolveOptions = (opts: TOption[]): TSpec[] => {
    if (opts === cachedOpts && cachedSpecs) return cachedSpecs;
    cachedOpts = opts;
    cachedSpecs = resolveOptions(opts);
    return cachedSpecs;
  };

  return defineImportRule({
    applyRule: (fromInfo, getImportInfo, context) =>
      applySpecs(
        cachedResolveOptions(context.options[0] as TOption[]),
        fromInfo,
        getImportInfo,
      ),
  });
};
