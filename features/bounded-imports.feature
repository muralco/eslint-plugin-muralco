Feature: bounded-imports

Background:
  Given the "bounded-imports" rule is enabled with
    """
    [2, ["/src/"]]
    """

Scenario: allow parent import
  When linting "./src/a/file.js" with
    """
    import '../b/other';
    """
  Then the code is OK

Scenario: reject src imports
  When linting "./src/a/file.js" with
    """
    import '../../src/other';
    """
  Then an error with message "Imports cannot contain /src/" is at
    """
    >>>import '../../src/other';<<<
    """
