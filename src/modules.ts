import { Rule } from 'eslint';
import { sep } from 'path';
import { defineImportRule, FromInfo, ImportInfo, toRe } from './util';

interface ExceptionSpec<T> {
  from: T;
  to: T;
}

interface ModuleOption {
  dependencies?: string[];
  exceptions?: ExceptionSpec<string>[];
  externals?: string[];
  interface?: string[] | string;
  message?: string;
  path: string;
  techdebt?: ExceptionSpec<string>[];
}

interface ModuleSpec {
  dependencies: string[];
  exceptions: ExceptionSpec<RegExp>[];
  externals: RegExp[];
  interfaces: RegExp[];
  message: string | undefined;
  path: string;
}

const ALLOW_ALL: RegExp[] = [];

export const PRIVATE_IMPLEMENTATION = `Module abstraction violation: '{from}' cannot import '{to}'.

'{to}' is part of module '{toModule}' but not listed in the module public
interface (i.e. is an implementation detail).`;

export const NOT_A_DEPENDENCY = `Module abstraction violation: '{from}' cannot import '{to}'.

'{toModule}' is not listed as a valid dependency of '{fromModule}'.`;

export const INVALID_EXTERNAL = `Module abstraction violation: '{from}' cannot import '{to}'.

'{fromModule}' has an explicit list of allowed external imports and '{to}' is not
in this list.`;

const matchPath = (specPath: string, otherPath: string): boolean =>
  otherPath === specPath || otherPath.includes(`${specPath}${sep}`);

const isModuleException = (
  from: FromInfo,
  to: ImportInfo,
  module: ModuleSpec,
): boolean =>
  module.exceptions.some(
    e =>
      from.absoluteFilePath.match(e.from) &&
      to.absoluteImportedPath.match(e.to),
  );

const inboundImportAllowed = (
  from: FromInfo,
  to: ImportInfo,
  toModule: ModuleSpec,
): boolean =>
  // `from` is importing from the modules public interface
  toModule.interfaces.some(i => to.absoluteImportedPath.match(i)) ||
  // or the `(from, to)` tuple is listed as a valid exception
  isModuleException(from, to, toModule);

const outboundModuleImportAllowed = (
  from: FromInfo,
  to: ImportInfo,
  fromModule: ModuleSpec,
  toModule: ModuleSpec,
): boolean =>
  // `to` is listed in the dependencies of `from`
  fromModule.dependencies.includes(toModule.path) ||
  // or the `(from, to)` tuple is listed as a valid exception
  isModuleException(from, to, fromModule);

const outboundExternalImportAllowed = (
  from: FromInfo,
  to: ImportInfo,
  fromModule: ModuleSpec,
): boolean =>
  // `from` can import any external file
  fromModule.externals === ALLOW_ALL ||
  // or `to` is listed in the externals of `from`
  fromModule.externals.some(e => to.absoluteImportedPath.match(e)) ||
  // or the `(from, to)` tuple is listed as a valid exception
  isModuleException(from, to, fromModule);

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
        if (!inboundImportAllowed(from, to, toModule)) {
          return [
            `${PRIVATE_IMPLEMENTATION.replace(/\{toModule\}/g, toModule.path)}${
              toModule.message ? `\n\n${toModule.message}` : ''
            }`,
          ];
        }
        if (
          fromModule &&
          !outboundModuleImportAllowed(from, to, fromModule, toModule)
        ) {
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
      if (fromModule && !outboundExternalImportAllowed(from, to, fromModule)) {
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
        exceptions: [
          ...(opt.exceptions || []),
          ...(opt.techdebt || []),
        ].map(e => ({ from: toRe(e.from), to: toRe(e.to) })),
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
