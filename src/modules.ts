import { Rule } from 'eslint';
import { sep } from 'path';
import { defineImportSpecRule, FromInfo, ImportInfo, toRe } from './util';

interface ExceptionSpec<T> {
  from: T;
  to: T;
}

interface DependencySpec {
  path: string;
  on: string | string[];
}

interface ModuleOption {
  dependencies?: (string | DependencySpec)[];
  exceptions?: ExceptionSpec<string>[];
  externals?: string[];
  interface?: string[] | string;
  message?: string;
  path: string;
  submodules?: ModuleOption[];
  techdebt?: ExceptionSpec<string>[];
}

interface ModuleSpec {
  dependencies: { path: string; on: RegExp[] }[];
  exceptions: ExceptionSpec<RegExp>[];
  externals: RegExp[];
  interfaces: RegExp[];
  message: string | undefined;
  path: string;
  submodules: ModuleSpec[];
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

const isModuleDependency = (
  fromModule: ModuleSpec,
  toModule: ModuleSpec,
  to: ImportInfo,
): boolean =>
  fromModule.dependencies.some(
    d =>
      d.path === toModule.path &&
      (d.on.length === 0 ||
        d.on.some(rule => to.absoluteImportedPath.match(rule))),
  );

const outboundModuleImportAllowed = (
  from: FromInfo,
  to: ImportInfo,
  fromModule: ModuleSpec,
  toModule: ModuleSpec,
): boolean =>
  // `to` is listed in the dependencies of `from`
  isModuleDependency(fromModule, toModule, to) ||
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

const resolveOption = (opt: ModuleOption): ModuleSpec => ({
  dependencies: (opt.dependencies || []).map(d =>
    typeof d === 'string'
      ? { path: d, on: [] }
      : {
          path: d.path,
          on: (typeof d.on === 'string' ? [d.on] : d.on).map(toRe),
        },
  ),
  exceptions: [...(opt.exceptions || []), ...(opt.techdebt || [])].map(e => ({
    from: toRe(e.from),
    to: toRe(e.to),
  })),
  externals: opt.externals ? opt.externals.map(toRe) : ALLOW_ALL,
  interfaces: (Array.isArray(opt.interface)
    ? opt.interface
    : opt.interface
    ? [opt.interface]
    : []
  ).map(toRe),
  message: opt.message,
  path: opt.path,
  submodules: opt.submodules ? opt.submodules.map(resolveOption) : [],
});

interface ApplyResult {
  errors: (string | null)[];
  fromModule?: ModuleSpec;
}

const applySpecs = (
  specs: ModuleSpec[],
  from: FromInfo,
  getTo: () => ImportInfo,
): ApplyResult => {
  const fromModule = specs.find(s => matchPath(s.path, from.absoluteFilePath));
  const to = getTo();
  const toModule = specs.find(s => matchPath(s.path, to.absoluteImportedPath));

  //   +-----+       +-----+
  //   |  A  | ----> |  A  |     Internal import, always allow, run submodules
  //   +-----+       +-----+
  //
  // Always allow inter-module imports
  if (fromModule === toModule) {
    // If we have submodules recurse into those
    if (fromModule && fromModule.submodules.length) {
      return applySpecs(fromModule.submodules, from, getTo);
    }
    return { errors: [], fromModule };
  }

  // The `import` clause targets a known module
  if (toModule) {
    //
    //   +-----+       +-----+     External import (from another module or from
    //   |  B  | ----> |  A  |     a non-module file), check A's interface
    //   +-----+       +-----+
    //                    ^
    //                    |
    //   not-module-------/
    //
    // The `import` is not targeting the module's public interface
    if (!inboundImportAllowed(from, to, toModule)) {
      return {
        errors: [
          `${PRIVATE_IMPLEMENTATION.replace(/\{toModule\}/g, toModule.path)}${
            toModule.message ? `\n\n${toModule.message}` : ''
          }`,
        ],
        fromModule,
      };
    }
  }

  if (fromModule) {
    //
    //   +-----+       +-----+     Outbound import to another module or a non-,
    //   |  B  | ----> |  A  |     module file, if B has submodules, check that
    //   +-----+       +-----+     first, otherwise, check if B is allowed to
    //      |                      import this file in B's `externals` and/or in
    //      \--------> non-module  its `dependencies`.

    // First we check submodules because they override whatever the parent
    // module specifies
    if (fromModule.submodules.length) {
      const submoduleResult = applySpecs(
        // In case this is B -> A, we need to include `specs` here because A is
        // not a submodule of B. We also need to exclude B (fromModule) to
        // prevent infinite recursion here
        [...fromModule.submodules, ...specs.filter(m => m !== fromModule)],
        from,
        getTo,
      );

      // If it matched a submodule, then whatever we got from that result must
      // be good
      if (submoduleResult.fromModule) {
        return submoduleResult;
      }
    }

    // Ok, so no submodules, so two options, either this is a cross-module
    // dependency (B -> A) or an external import (B -> non-module).

    if (toModule) {
      //
      //   +-----+       +-----+     Cross-module dependency (B targets A's
      //   |  B  | ----> |  A  |     public interface), check if B is allowed to
      //   +-----+       +-----+     import A in B's `dependencies`.
      //
      if (!outboundModuleImportAllowed(from, to, fromModule, toModule)) {
        return {
          errors: [
            `${NOT_A_DEPENDENCY.replace(/\{toModule\}/g, toModule.path).replace(
              /\{fromModule\}/g,
              fromModule.path,
            )}${fromModule.message ? `\n\n${fromModule.message}` : ''}`,
          ],
          fromModule,
        };
      }
      // We are importing some other module's public interface and our module
      // lists the imported module as an explicit dependency, so we're good
      return { errors: [], fromModule };
    }

    //
    //   +-----+                   Outbound import to non-module file, check if
    //   |  B  | ----> non-module  B is allowed to import this file in B's
    //   +-----+                   `externals`.
    //
    // We are in a module but we are importing an external file (not part of
    // any module)
    if (!outboundExternalImportAllowed(from, to, fromModule)) {
      return {
        errors: [
          `${INVALID_EXTERNAL.replace(/\{fromModule\}/g, fromModule.path)}${
            fromModule.message ? `\n\n${fromModule.message}` : ''
          }`,
        ],
        fromModule,
      };
    }
  }

  return { errors: [], fromModule };
};
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
  create: defineImportSpecRule<ModuleOption, ModuleSpec>({
    applySpecs: (specs, from, to) => applySpecs(specs, from, to).errors,
    resolveOptions: opts => opts.map(resolveOption),
  }),
};

export default modulesRule;
