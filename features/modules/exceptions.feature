Feature: modules (exceptions / techdebt)

Background:
  Given the "modules" rule is enabled with
    """
    [2, [
      {
        "exceptions": [
          { "from": "src/business/exception.ts", "to": "src/data/internal-ex" },
          { "from": "src/data/exception-external.ts", "to": "mongodb-ex" },
          { "from": "src/data/exception-dependency.ts", "to": "src/business/public/dep-ex" }
        ],
        "externals": ["postgres", "redis"],
        "interface": ["/public/"],
        "path": "src/data",
        "techdebt": [
          { "from": "src/business/techdebt.ts", "to": "src/data/internal-td" },
          { "from": "src/data/techdebt-external.ts", "to": "mongodb-td" },
          { "from": "src/data/techdebt-dependency.ts", "to": "src/business/public/dep-td" }
        ]
      },
      {
        "dependencies": ["src/data"],
        "interface": ["/public/"],
        "path": "src/business"
      }
    ]]
    """

# === Inbound ================================================================ #

Scenario: allow exception inbound imports
  When linting "./src/business/exception.ts" with
    """
    import '../data/internal-ex';
    """
  Then the code is OK

Scenario: allow techdebt inbound imports
  When linting "./src/business/techdebt.ts" with
    """
    import '../data/internal-td';
    """
  Then the code is OK

Scenario: reject non-exception inbound imports
  When linting "./src/business/other.ts" with
    """
    import '../data/internal-ex';
    """
  Then an error is at
    """
    >>>import '../data/internal-ex';<<<
    """
  And that error message matches MODULE_INBOUND_PRIVATE with
    """
    {
      "from": "./src/business/other.ts",
      "to": "../data/internal-ex",
      "toModule": "src/data"
    }
    """

Scenario: reject non-techdebt inbound imports
  When linting "./src/business/other.ts" with
    """
    import '../data/internal-td';
    """
  Then an error is at
    """
    >>>import '../data/internal-td';<<<
    """
  And that error message matches MODULE_INBOUND_PRIVATE with
    """
    {
      "from": "./src/business/other.ts",
      "to": "../data/internal-td",
      "toModule": "src/data"
    }
    """

# === Outbound externals ===================================================== #

Scenario: allow exception outbound external imports
  When linting "./src/data/exception-external.ts" with
    """
    import 'mongodb-ex';
    """
  Then the code is OK

Scenario: allow techdebt outbound external imports
  When linting "./src/data/techdebt-external.ts" with
    """
    import 'mongodb-td';
    """
  Then the code is OK

Scenario: reject non-exception outbound external imports
  When linting "./src/data/other.ts" with
    """
    import 'mongodb-ex';
    """
  Then an error is at
    """
    >>>import 'mongodb-ex';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/data/other.ts",
      "to": "mongodb-ex",
      "fromModule": "src/data"
    }
    """

Scenario: reject non-techdebt outbound external imports
  When linting "./src/data/other.ts" with
    """
    import 'mongodb-td';
    """
  Then an error is at
    """
    >>>import 'mongodb-td';<<<
    """
  And that error message matches MODULE_OUTBOUND_EXTERNAL with
    """
    {
      "from": "./src/data/other.ts",
      "to": "mongodb-td",
      "fromModule": "src/data"
    }
    """

# === Outbound dependencies ================================================== #

Scenario: allow exception outbound dependency imports
  When linting "./src/data/exception-dependency.ts" with
    """
    import '../business/public/dep-ex';
    """
  Then the code is OK

Scenario: allow techdebt outbound dependency imports
  When linting "./src/data/techdebt-dependency.ts" with
    """
    import '../business/public/dep-td';
    """
  Then the code is OK

Scenario: reject non-exception outbound dependency imports
  When linting "./src/data/other.ts" with
    """
    import '../business/public/dep-ex';
    """
  Then an error is at
    """
    >>>import '../business/public/dep-ex';<<<
    """
  And that error message matches MODULE_OUTBOUND_DEPENDENCY with
    """
    {
      "from": "./src/data/other.ts",
      "to": "../business/public/dep-ex",
      "fromModule": "src/data",
      "toModule": "src/business"
    }
    """

Scenario: reject non-techdebt outbound dependency imports
  When linting "./src/data/other.ts" with
    """
    import '../business/public/dep-td';
    """
  Then an error is at
    """
    >>>import '../business/public/dep-td';<<<
    """
  And that error message matches MODULE_OUTBOUND_DEPENDENCY with
    """
    {
      "from": "./src/data/other.ts",
      "to": "../business/public/dep-td",
      "fromModule": "src/data",
      "toModule": "src/business"
    }
    """
