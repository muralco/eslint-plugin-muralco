Feature: layers

Background:
  Given the "layers" rule is enabled with
    """
    [2, [
      {
        "allowChildren": false,
        "from": "/types\\.ts$",
        "to": ["/types$"],
        "message": "A 'types.ts' can only import other 'types.ts' files"
      },
      {
        "from": "/src/a/",
        "to": ["/src/b/"],
        "message": "Files from layer 'a' can only import files from layer 'b'"
      },
      { "from": "/src/global/", "to": ["^allowed"] }
    ]]
    """

Scenario: allow explicit layers
  When linting "./src/a/file.js" with
    """
    import '../b/other';
    """
  Then the code is OK

Scenario: import from the same layer
  When linting "./src/a/file.js" with
    """
    import './other';
    """
  Then the code is OK

Scenario: import from nested layer
  When linting "./src/a/file.js" with
    """
    import './nested/other';
    """
  Then the code is OK

Scenario: import from parent layer
  When linting "./src/a/nested/file.js" with
    """
    import '../other';
    """
  Then the code is OK

Scenario: cannot import from an unknown layer
  When linting "./src/a/file.js" with
    """
    import '../c/other';
    """
  Then an error is at
    """
    >>>import '../c/other';<<<
    """

Scenario: unknown layers can import anything
  When linting "./src/x/file.js" with
    """
    import '../y/other';
    """
  Then the code is OK

Scenario: allow global
  When linting "./src/global/file.js" with
    """
    import 'allowed-a';
    """
  Then the code is OK

Scenario: allowed by name
  When linting "./src/x/types.ts" with
    """
    import './other/types';
    """
  Then the code is OK

Scenario: rejected by name
  When linting "./src/x/types.ts" with
    """
    import './utils';
    """
  Then an error with message "A 'types.ts' can only import other 'types.ts' files" is at
    """
    >>>import './utils';<<<
    """

Scenario: allowed mutiple (children)
  When linting "./src/a/types.ts" with
    """
    import './utils/types';
    """
  Then the code is OK

Scenario: allowed mutiple (cross-layer)
  When linting "./src/a/types.ts" with
    """
    import '../b/types';
    """
  Then the code is OK

Scenario: rejected mutiple
  When linting "./src/a/types.ts" with
    """
    import '../c/util';
    """
  Then an error with message "A 'types.ts' can only import other 'types.ts' files" is at
    """
    >>>import '../c/util';<<<
    """
  Then an error with message "Files from layer 'a' can only import files from layer 'b'" is at
    """
    >>>import '../c/util';<<<
    """

Scenario: allowed nested siblings
  When linting "./src/a/1/file.ts" with
    """
    import '../2/other';
    """
  Then the code is OK