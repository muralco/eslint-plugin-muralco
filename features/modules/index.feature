Feature: modules

Background:
  Given the "modules" rule is enabled with
    """
    [2, [
      {
        "externals": ["postgres", "redis"],
        "interface": ["/readers/.*/types$", "/readers/\\w+$"],
        "message": "Data module is defined in https://path/to/docs",
        "path": "src/data"
      },
      {
        "dependencies": ["src/data"],
        "interface": ["/controllers/\\w+"],
        "path": "src/business"
      },
      {
        "dependencies": ["src/business"],
        "externals": ["async-app", "mural-schema"],
        "message": "Check transport module in eslintc.js",
        "path": "src/transport"
      }
    ]]
    """

# Intra-module

Scenario: allow private intra-module dependencies
  When linting "./src/data/private/file.js" with
    """
    import '../common/other';
    """
  Then the code is OK

Scenario: allow module interface importing module implementation
  When linting "./src/data/readers/file.js" with
    """
    import '../private/other';
    """
  Then the code is OK

Scenario: allow re-exporting implementation
  When linting "./src/data/readers/file.js" with
    """
    export { fn } from '../private/other';
    """
  Then the code is OK

Scenario: allow module implementation importing module interface
  When linting "./src/data/private/file.js" with
    """
    import '../readers/other';
    """
  Then the code is OK

Scenario: allow re-exporting interface
  When linting "./src/data/readers/file.js" with
    """
    export { fn } from '../readers/other';
    """
  Then the code is OK

# Non-module

Scenario: allow non-module dependencies
  When linting "./src/non-module/file.js" with
    """
    import './other';
    """
  Then the code is OK

Scenario: allow re-export non-module dependencies
  When linting "./src/non-module/file.js" with
    """
    export { fn } from './other';
    """
  Then the code is OK

Scenario: allow non-module to import module interface
  When linting "./src/app.js" with
    """
    import './data/readers/other';
    """
  Then the code is OK

Scenario: allow non-module to re-export module interface
  When linting "./src/app.js" with
    """
    export { fn } from './data/readers/other';
    """
  Then the code is OK

Scenario: reject non-module importing module implementation
  When linting "./src/app.js" with
    """
    import './data/private/other';
    """
  Then an error is at
    """
    >>>import './data/private/other';<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/app.js' cannot import './data/private/other'.
    
    './data/private/other' is part of module 'src/data' but not listed in the module public
    interface (i.e. is an implementation detail).

    Data module is defined in https://path/to/docs
    """

Scenario: reject non-module re-exporting module implementation
  When linting "./src/app.js" with
    """
    export { fn } from './data/private/other';
    """
  Then an error is at
    """
    >>>export { fn } from './data/private/other';<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/app.js' cannot import './data/private/other'.
    
    './data/private/other' is part of module 'src/data' but not listed in the module public
    interface (i.e. is an implementation detail).

    Data module is defined in https://path/to/docs
    """

Scenario: reject non-module re-exporting full module implementation
  When linting "./src/app.js" with
    """
    export * from './data/private/other';
    """
  Then an error is at
    """
    >>>export * from './data/private/other';<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/app.js' cannot import './data/private/other'.
    
    './data/private/other' is part of module 'src/data' but not listed in the module public
    interface (i.e. is an implementation detail).

    Data module is defined in https://path/to/docs
    """

Scenario: reject non-module re-exporting default module implementation
  When linting "./src/app.js" with
    """
    export { default as fn } from './data/private/other';
    """
  Then an error is at
    """
    >>>export { default as fn } from './data/private/other';<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/app.js' cannot import './data/private/other'.
    
    './data/private/other' is part of module 'src/data' but not listed in the module public
    interface (i.e. is an implementation detail).

    Data module is defined in https://path/to/docs
    """

# Module externals

Scenario: allow explicit externals
  When linting "./src/data/private/file.js" with
    """
    import 'postgres';
    """
  Then the code is OK

Scenario: allow implicit externals (no module limitation)
  When linting "./src/business/private/file.js" with
    """
    import 'ms';
    """
  Then the code is OK

Scenario: reject invalid externals
  When linting "./src/transport/file.js" with
    """
    import 'redis';
    """
  Then an error is at
    """
    >>>import 'redis';<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/transport/file.js' cannot import 'redis'.
    
    'src/transport' has an explicit list of allowed external imports and 'redis' is not
    in this list.

    Check transport module in eslintc.js
    """

# Cross-module

Scenario: allow explicit cross-module import
  When linting "./src/business/private/file.js" with
    """
    import '../../data/readers/other';
    """
  Then the code is OK

Scenario: reject target module not listed in this module's dependencies
  When linting "./src/data/file.js" with
    """
    import '../business/controllers/other';
    """
  Then an error is at
    """
    >>>import '../business/controllers/other';<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/data/file.js' cannot import '../business/controllers/other'.
    
    'src/business' is not listed as a valid dependency of 'src/data'.

    Data module is defined in https://path/to/docs
    """

# NodeJS require support

Scenario: allow explicit cross-module import (node)
  When linting "./src/business/private/file.js" with
    """
    require('../../data/readers/other');
    """
  Then the code is OK

Scenario: reject target module not listed in this module's dependencies
  When linting "./src/data/file.js" with
    """
    require('../business/controllers/other');
    """
  Then an error is at
    """
    >>>require('../business/controllers/other')<<<
    """
  And that error message includes
    """
    Module abstraction violation: './src/data/file.js' cannot import '../business/controllers/other'.
    
    'src/business' is not listed as a valid dependency of 'src/data'.

    Data module is defined in https://path/to/docs
    """

# Path matching

Scenario: no false positives with path prefix for module spec
  # `src/data` is a module, but `src/data-stuff` is not part of that module!
  When linting "./src/data-stuff.js" with
    """
    import 'random-external';
    """
  Then the code is OK

Scenario: no false positives with path prefix for import
  # `src/data` is a module, but `src/data-stuff` is not part of that module!
  When linting "./src/business/file.js" with
    """
    import '../data-stuff';
    """
  Then the code is OK
  # because we can import random code from `src/business` and `data-stuff` is
  # being picked up as a private implementation of `src/data`
