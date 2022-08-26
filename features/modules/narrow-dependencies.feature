Feature: modules (narrow dependencies)

Background:
  Given the "modules" rule is enabled with
    """
    [2, [
      {
        "path": "src/a",
        "dependencies": [{ "path": "src/b", "on": ["/only/"] }]
      },
      { "path": "src/b", "interface": ".*" },
      { "path": "src/c", "interface": ".*" }
    ]]
    """

Scenario: allow import on the listed interface
  When linting "./src/a/file.ts" with
    """
    import '../b/only/file';
    """
  Then the code is OK

Scenario: reject import on unlisted modules
  When linting "./src/a/file.ts" with
    """
    import '../c/only/file';
    """
  Then an error is at
    """
    >>>import '../c/only/file';<<<
    """
  And that error message matches MODULE_OUTBOUND_DEPENDENCY with
    """
    {
      "from": "./src/a/file.ts",
      "to": "../c/only/file",
      "fromModule": "src/a",
      "toModule": "src/c"
    }
    """

Scenario: reject import on unscoped interface of listed module
  When linting "./src/a/file.ts" with
    """
    import '../b/other/file';
    """
  Then an error is at
    """
    >>>import '../b/other/file';<<<
    """
  And that error message matches MODULE_OUTBOUND_DEPENDENCY with
    """
    {
      "from": "./src/a/file.ts",
      "to": "../b/other/file",
      "fromModule": "src/a",
      "toModule": "src/b"
    }
    """
