Feature: sorted-imports

Background:
  Given the "sorted-imports" rule is enabled

Scenario: happy path
  When applying the linter to
    """
    import { readFile } from 'fs';
    import { join } from 'path';
    import { x } from '../../x';
    import { y } from '../../y';
    import { v } from '../v';
    import { w } from '../w';
    import { t } from './t';
    import { u } from './u';
    """
  Then the code is OK

Scenario: unsorted
  When applying the linter to
    """
    import { b } from './b';
    import { a } from './a';
    """
  Then an error is at
    """
    import { b } from './b';
    >>>import { a } from './a';<<<
    """
  And the fixed code is
    """
    import { a } from './a';
    import { b } from './b';
    """

Scenario: sort mutiple
  When applying the linter to
    """
    import './c';
    import { b } from './b';
    import { a } from './a';
    """
  Then an error is at
    """
    import './c';
    >>>import { b } from './b';<<<
    import { a } from './a';
    """
  And the fixed code is
    """
    import { a } from './a';
    import { b } from './b';
    import './c';
    """

Scenario: files before global
  When applying the linter to
    """
    import { a } from './a';
    import 'fs';
    """
  Then an error is at
    """
    import { a } from './a';
    >>>import 'fs';<<<
    """
  And the fixed code is
    """
    import 'fs';
    import { a } from './a';
    """

Scenario: nearer before farther
  When applying the linter to
    """
    import { a1 } from './a';
    import { a2 } from '../a';
    """
  Then an error is at
    """
    import { a1 } from './a';
    >>>import { a2 } from '../a';<<<
    """
  And the fixed code is
    """
    import { a2 } from '../a';
    import { a1 } from './a';
    """

Scenario: unsorted global
  When applying the linter to
    """
    import { a1 } from 'path';
    import { a2 } from 'fs';
    """
  Then an error is at
    """
    import { a1 } from 'path';
    >>>import { a2 } from 'fs';<<<
    """
  And the fixed code is
    """
    import { a2 } from 'fs';
    import { a1 } from 'path';
    """

Scenario: unsorted deep paths
  When applying the linter to
    """
    import { a1 } from '../../b';
    import { a2 } from '../../a';
    """
  Then an error is at
    """
    import { a1 } from '../../b';
    >>>import { a2 } from '../../a';<<<
    """
  And the fixed code is
    """
    import { a2 } from '../../a';
    import { a1 } from '../../b';
    """

Scenario: ignore non-consecutive imports
  When applying the linter to
    """
    import { a1 } from './b';

    import { a2 } from './a';
    """
  Then the code is OK

Scenario: long unsorted list
  When applying the linter to
    """
    import z from './z';
    import y from './y';
    import x from './x';
    import w from './w';
    import v from './v';
    import u from './u';
    import t from './t';
    import s from './s';
    import r from './r';
    import q from './q';
    import p from './p';
    import o from './o';
    import n from './n';
    import m from './m';
    import l from './l';
    import k from './k';
    import j from './j';
    import i from './i';
    import h from './h';
    import g from './g';
    import f from './f';
    import e from './e';
    import d from './d';
    import c from './c';
    import b from './b';
    import a from './a';
    """
  Then the fixed code is
    """
    import a from './a';
    import b from './b';
    import c from './c';
    import d from './d';
    import e from './e';
    import f from './f';
    import g from './g';
    import h from './h';
    import i from './i';
    import j from './j';
    import k from './k';
    import l from './l';
    import m from './m';
    import n from './n';
    import o from './o';
    import p from './p';
    import q from './q';
    import r from './r';
    import s from './s';
    import t from './t';
    import u from './u';
    import v from './v';
    import w from './w';
    import x from './x';
    import y from './y';
    import z from './z';
    """
