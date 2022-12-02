Feature: no-inline-script

Background:
  Given the "no-inline-script" rule is enabled

Scenario: allow call to createElement with other tag
  When applying the linter to
    """
    const a = document.createElement('a');
    """
  Then the code is OK
 
Scenario: allow call to createElement with other tag with a variable
  When applying the linter to
    """
    const myVar = 'script';
    function myFunc() {
      const myVar = 'div';
      const script = document.createElement(myVar);
    }
    """
  Then the code is OK

Scenario Outline: do not allow to create scripts literally
  When applying the linter to
    """
    const script = document.createElement(<script-literal>);
    """
  Then the errors at 0.message is "Adding scripts to HTML directly is not allowed"

  Examples:
      | script-literal |
      | 'script' |
      | 'sCrIpT' |
      | 'SCRIPT' |

Scenario Outline: do not allow to create scripts with variables
  When applying the linter to
    """
    const myVar = <script-literal>;
    const script = document.createElement(myVar);
    """
  Then the errors at 0.message is "Adding scripts to HTML directly is not allowed"

  Examples:
      | script-literal |
      | 'script' |
      | 'sCrIpT' |
      | 'SCRIPT' |

Scenario: do not allow to create scripts with variables in other scope
  When applying the linter to
    """
    const myVar = 'script';
    function myFunc() {
      const script = document.createElement(myVar);
    }
    """
  Then the errors at 0.message is "Adding scripts to HTML directly is not allowed"

Scenario: do not allow to create scripts with variables if the current variable is commented out
  When applying the linter to
    """
    const myVar = 'script';
    function myFunc() {
      // const myVar = 'div';
      const script = document.createElement(myVar);
    }
    """
  Then the errors at 0.message is "Adding scripts to HTML directly is not allowed"
