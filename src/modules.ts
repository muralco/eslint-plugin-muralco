import { Rule } from 'eslint';
import { sep } from 'path';
import { defineImportRule, toRe } from './util';

interface ModuleOption {
  dependencies?: string[];
  externals?: string[];
  interface?: string[] | string;
  message?: string;
  path: string;
}

interface ModuleSpec {
  dependencies: string[];
  externals: RegExp[];
  interfaces: RegExp[];
  message: string | undefined;
  path: string;
}

const ALLOW_ALL: RegExp[] = [];

const PRIVATE_IMPLEMENTATION = `Module abstraction violation: '{from}' cannot import '{to}'.

'{to}' is part of module '{toModule}' but not listed in the module public
interface (i.e. is an implementation detail).`;

const NOT_A_DEPENDENCY = `Module abstraction violation: '{from}' cannot import '{to}'.

'{toModule}' is not listed as a valid dependency of '{fromModule}'.`;

const INVALID_EXTERNAL = `Module abstraction violation: '{from}' cannot import '{to}'.

'{fromModule}' has an explicit list of allowed external imports and '{to}' is not
in this list.`;

const matchPath = (specPath: string, otherPath: string): boolean =>
  otherPath === specPath || otherPath.includes(`${specPath}${sep}`);

const modulesRule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'enforce module abstraction',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [
      {
        items: {
          properties: {
            dependencies: { type: 'array', items: { type: 'string' } },
            interface: {
              oneOf: [
                { type: 'array', items: { type: 'string' } },
                { type: 'string' },
              ],
            },
            message: { type: 'string' },
            path: { type: 'string', required: true },
          },
          type: 'object',
        },
        required: true,
        type: 'array',
      },
    ],
    type: 'suggestion',
  },
  create: defineImportRule<ModuleOption, ModuleSpec>({
    applySpecs: (specs, from, getTo) => {
      const fromModule = specs.find(s =>
        matchPath(s.path, from.absoluteFilePath),
      );
      const to = getTo();
      const toModule = specs.find(s =>
        matchPath(s.path, to.absoluteImportedPath),
      );
      // Always allow inter-module imports
      if (fromModule === toModule) return [];

      // The `import` clause targets a known module
      if (toModule) {
        // The `import` is not targeting the module's public interface
        if (!toModule.interfaces.some(i => to.absoluteImportedPath.match(i))) {
          return [
            `${PRIVATE_IMPLEMENTATION.replace(/\{toModule\}/g, toModule.path)}${
              toModule.message ? `\n\n${toModule.message}` : ''
            }`,
          ];
        }
        if (fromModule && !fromModule.dependencies.includes(toModule.path)) {
          return [
            `${NOT_A_DEPENDENCY.replace(/\{toModule\}/g, toModule.path).replace(
              /\{fromModule\}/g,
              fromModule.path,
            )}${fromModule.message ? `\n\n${fromModule.message}` : ''}`,
          ];
        }
        // We are importing some other module's public interface and our module
        // (if any), lists the imported module as an explicit dependency, so
        // we're good
        return [];
      }

      // We are in a module but we are importing an external file (not part of
      // any module)
      if (
        fromModule &&
        fromModule.externals !== ALLOW_ALL &&
        !fromModule.externals.some(e => to.absoluteImportedPath.match(e))
      ) {
        return [
          `${INVALID_EXTERNAL.replace(/\{fromModule\}/g, fromModule.path)}${
            fromModule.message ? `\n\n${fromModule.message}` : ''
          }`,
        ];
      }

      return [];
    },
    resolveOptions: opts =>
      opts.map(opt => ({
        dependencies: opt.dependencies || [],
        externals: opt.externals ? opt.externals.map(toRe) : ALLOW_ALL,
        interfaces: (Array.isArray(opt.interface)
          ? opt.interface
          : opt.interface
          ? [opt.interface]
          : []
        ).map(toRe),
        message: opt.message,
        path: opt.path,
      })),
  }),
};

export default modulesRule;
