Feature: short-imports

Background:
  Given the "short-imports" rule is enabled with [2]

Scenario: allow parent import
  When linting "./src/a/file.js" with
    """
    import '../b/other';
    """
  Then the code is OK

Scenario: allow package import
  When linting "./src/a/file.js" with
    """
    import 'some-package';
    """
  Then the code is OK

Scenario: allow absolute import
  When linting "./src/a/file.js" with
    """
    import '/some-dir';
    """
  Then the code is OK

Scenario: reject redundant '//'
  When linting "./src/a/file.js" with
    """
    import '..//other';
    """
  Then an error with message "This import path looks longer than it needs to be. Replace with '../other'" is at
    """
    >>>import '..//other';<<<
    """
  And the fixed code is
    """
    import '../other';
    """

Scenario: collapse './..'
  When linting "./src/a/file.js" with
    """
    import './../other';
    """
  Then an error with message "This import path looks longer than it needs to be. Replace with '../other'" is at
    """
    >>>import './../other';<<<
    """
  And the fixed code is
    """
    import '../other';
    """

Scenario: exit and enter
  When linting "./src/a/file.js" with
    """
    import '../a/other';
    """
  Then an error with message "This import path looks longer than it needs to be. Replace with './other'" is at
    """
    >>>import '../a/other';<<<
    """
  And the fixed code is
    """
    import './other';
    """

Scenario: weird: allow parent index (end in "..")
  When linting "./src/a/file.js" with
    """
    import '..';
    """
  Then the code is OK

Scenario: weird: parent index (end in "..")
  Given the "short-imports" rule is enabled with [2, { "rejectWeird": true }]
  When linting "./src/a/file.js" with
    """
    import '..';
    """
  Then an error with message "This import path looks weird. Replace with '../index'" is at
    """
    >>>import '..';<<<
    """
  And the fixed code is
    """
    import '../index';
    """

Scenario: weird: parent index (end in "/")
  Given the "short-imports" rule is enabled with [2, { "rejectWeird": true }]
  When linting "./src/a/file.js" with
    """
    import '../';
    """
  Then an error with message "This import path looks weird. Replace with '../index'" is at
    """
    >>>import '../';<<<
    """
  And the fixed code is
    """
    import '../index';
    """

Scenario: weird: my index (end in ".")
  Given the "short-imports" rule is enabled with [2, { "rejectWeird": true }]
  When linting "./src/a/file.js" with
    """
    import '.';
    """
  Then an error with message "This import path looks weird. Replace with './index'" is at
    """
    >>>import '.';<<<
    """
  And the fixed code is
    """
    import './index';
    """

Scenario: weird: my index (end in "/")
  Given the "short-imports" rule is enabled with [2, { "rejectWeird": true }]
  When linting "./src/a/file.js" with
    """
    import './';
    """
  Then an error with message "This import path looks weird. Replace with './index'" is at
    """
    >>>import './';<<<
    """
  And the fixed code is
    """
    import './index';
    """
