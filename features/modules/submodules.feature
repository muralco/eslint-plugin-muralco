Feature: modules (submodules)

Background:
  Given the "modules" rule is enabled with
    """
    [2, [
      {
        "dependencies": ["src/b"],
        "externals": ["a-ext"],
        "interface": "/public/",
        "path": "src/a",
        "submodules": [
          {
            "dependencies": ["src/a/y"],
            "externals": ["a-x-ext"],
            "interface": "/public-x/",
            "path": "src/a/x",
            "techdebt": [
              { "from": "src/a/x/legacy.ts", "to": "legacy" }
            ]
          },
          {
            "dependencies": ["src/c"],
            "externals": ["a-y-ext"],
            "interface": "/public-y/",
            "path": "src/a/y"
          },
          { "path": "src/a/z" }
        ]
      },
      { "path": "src/b", "interface": "/public-b/" },
      { "path": "src/c", "interface": "/public-c/" }
    ]]
    """

# === Inbound ================================================================ #

Scenario: allow external imports a's interface
  When linting "./src/external.ts" with
    """
    import './a/public/file';
    """
  Then the code is OK

Scenario: reject external imports a.x's interface
  When linting "./src/external.ts" with
    """
    import './a/x/public-x/file';
    """
  Then an error is at
    """
    >>>import './a/x/public-x/file';<<<
    """
  And that error message matches MODULE_INBOUND_PRIVATE with
    """
    {
      "from": "./src/external.ts",
      "to": "./a/x/public-x/file",
      "toModule": "src/a"
    }
    """

# === Internal =============================================================== #

# Inbound

Scenario: allow x imports y interface
  When linting "./src/a/x/file.ts" with
    """
    import '../y/public-y/file';
    """
  Then the code is OK

Scenario: reject x imports y implementaiton
  When linting "./src/a/x/file.ts" with
    """
    import '../y/file';
    """
  Then an error is at
    """
    >>>import '../y/file';<<<
    """
  And that error message matches MODULE_INBOUND_PRIVATE with
    """
    {
      "from": "./src/a/x/file.ts",
      "to": "../y/file",
      "toModule": "src/a/y"
    }
    """

# Outbound (external)

Scenario: allow a imports external
  When linting "./src/a/file.ts" with
    """
    import 'a-ext';
    """
  Then the code is OK

Scenario: allow a/x imports a/x external
  When linting "./src/a/x/file.ts" with
    """
    import 'a-x-ext';
    """
  Then the code is OK

Scenario: allow a/x techdebt
  When linting "./src/a/x/legacy.ts" with
    """
    import 'legacy';
    """
  Then the code is OK

Scenario: reject a imports invalid external
  When linting "./src/a/file.ts" with
    """
    import 'invalid';
    """
  Then an error is at
    """
    >>>import 'invalid';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/a/file.ts",
      "to": "invalid",
      "fromModule": "src/a"
    }
    """

Scenario: reject a imports a/x external
  When linting "./src/a/file.ts" with
    """
    import 'a-x-ext';
    """
  Then an error is at
    """
    >>>import 'a-x-ext';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/a/file.ts",
      "to": "a-x-ext",
      "fromModule": "src/a"
    }
    """

Scenario: reject a/x imports a external
  When linting "./src/a/x/file.ts" with
    """
    import 'a-ext';
    """
  Then an error is at
    """
    >>>import 'a-ext';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/a/x/file.ts",
      "to": "a-ext",
      "fromModule": "src/a/x"
    }
    """

Scenario: reject a/x imports a/y external
  When linting "./src/a/x/file.ts" with
    """
    import 'a-y-ext';
    """
  Then an error is at
    """
    >>>import 'a-y-ext';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/a/x/file.ts",
      "to": "a-y-ext",
      "fromModule": "src/a/x"
    }
    """

Scenario: reject a imports a/x techdebt
  When linting "./src/a/file.ts" with
    """
    import 'legacy';
    """
  Then an error is at
    """
    >>>import 'legacy';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/a/file.ts",
      "to": "legacy",
      "fromModule": "src/a"
    }
    """

# Outbound (dependencies)

Scenario: allow a imports b
  When linting "./src/a/file.ts" with
    """
    import '../b/public-b/file';
    """
  Then the code is OK

Scenario: allow a/y imports c
  When linting "./src/a/y/file.ts" with
    """
    import '../../c/public-c/file';
    """
  Then the code is OK

Scenario: reject a imports c
  When linting "./src/a/file.ts" with
    """
    import '../c/public-c/file';
    """
  Then an error is at
    """
    >>>import '../c/public-c/file';<<<
    """
  And that error message matches MODULE_OUTBOUND_DEPENDENCY with
    """
    {
      "from": "./src/a/file.ts",
      "to": "../c/public-c/file",
      "fromModule": "src/a",
      "toModule": "src/c"
    }
    """

