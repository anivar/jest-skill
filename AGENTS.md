# Jest — Complete Guide

> This document is for AI agents and LLMs to follow when writing, reviewing, or debugging Jest tests. It compiles all rules and references into a single executable guide.

**Baseline:** jest ^30.5.2 with JavaScript or TypeScript (audited against jest 30.5.2)

---

## Abstract

Jest is the most widely-used JavaScript testing framework, providing a test runner, assertion library, mock system, and coverage reporter in one package. This guide covers the most impactful patterns and pitfalls: mock lifecycle management (clear vs reset vs restore), async testing traps (floating promises, missing assertion guards), matcher selection (toBe vs toEqual vs toStrictEqual), timer mocking (recursive safety, async timers), module mocking (hoisting, ESM, per-test mocks), snapshot testing (determinism, property matchers), configuration (coverage thresholds, environments, ESM transforms), and CI optimization (workers, sharding). Each rule includes incorrect and correct code examples targeting specific mistakes AI agents commonly make.

---

## Table of Contents

1. [Mock Design](#1-mock-design) — CRITICAL
2. [Async Testing](#2-async-testing) — CRITICAL
3. [Matcher Usage](#3-matcher-usage) — HIGH
4. [Timer Mocking](#4-timer-mocking) — HIGH
5. [Test Structure](#5-test-structure) — HIGH
6. [Module Mocking](#6-module-mocking) — MEDIUM
7. [Snapshot Testing](#7-snapshot-testing) — MEDIUM
8. [Configuration](#8-configuration) — MEDIUM
9. [Performance & CI](#9-performance--ci) — MEDIUM

---

## 1. Mock Design
**Impact: CRITICAL**

### Rule: clearAllMocks vs resetAllMocks vs restoreAllMocks

Jest provides three mock-cleanup functions with very different behaviors. Using the wrong one leaves stale mocks in place.

```javascript
// INCORRECT — clearAllMocks only clears call history, not implementations
afterEach(() => {
  jest.clearAllMocks();
});

test('first', () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  expect(Math.random()).toBe(0.5);
});

test('second', () => {
  // Math.random is STILL mocked — returns 0.5
  expect(Math.random()).not.toBe(0.5); // FAILS
});

// CORRECT — restoreAllMocks restores original implementations
afterEach(() => {
  jest.restoreAllMocks();
});
```

| Function | Clears calls | Removes implementation | Restores original |
|---|---|---|---|
| `clearAllMocks` | Yes | No | No |
| `resetAllMocks` | Yes | Yes — every mock then returns `undefined` | No |
| `restoreAllMocks` | No | No | Yes — `spyOn` / `replaceProperty` only |

`restoreAllMocks` does not clear call history: a restored spy keeps its calls, and a plain `jest.fn` keeps its calls and implementation. A single mock's `mockRestore()` clears, resets and restores.

Prefer `clearMocks: true` with `restoreMocks: true` in `jest.config.js` as the safest default; `restoreMocks` alone lets call history carry into the next test. `restoreMocks` covers `jest.spyOn` and `jest.replaceProperty` only — a method you overwrote by hand with `jest.fn()` is never restored, so use `jest.spyOn` instead of manual assignment.

### Rule: Always Restore jest.spyOn

`jest.spyOn` replaces a method on an existing object. If not restored, every subsequent test sees the mock.

```javascript
// INCORRECT — spy is never restored
test('suppresses errors', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  doSomething();
  expect(console.error).toHaveBeenCalled();
});
// console.error stays mocked for all remaining tests

// CORRECT
afterEach(() => jest.restoreAllMocks());
// or: jest.config.js → { clearMocks: true, restoreMocks: true }

// CORRECT (scope-bound) — the runtime must support `using`: Node 24.22.1 and 26 run it with the
// default babel-jest; Node 22 fails with a SyntaxError (lower it with TypeScript >= 5.2 or Babel there)
test('logs a warning', () => {
  using spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  console.warn('watch out');
  expect(spy).toHaveBeenCalled();
}); // mockRestore() runs on block exit, even if the assertion throws
```

### Rule: jest.mock Factory Cannot Reference Outer Variables

Calls to `jest.mock()` are hoisted above all imports, so a variable cannot be
defined first and then used in the factory. Jest makes an exception for names
matching `/^mock/i` (so `mocked` passes too), and for a `const` with a pure
initializer, which it moves up with the mock. A variable set by a function call
is rejected when the file is transformed.

```javascript
// INCORRECT — `fakeUser` does not begin with `mock` and is set by a call
const { buildUser } = require('./factories');
const fakeUser = buildUser({ name: 'Alice' });
jest.mock('./userService', () => ({
  getUser: jest.fn(() => fakeUser),
}));
// ReferenceError: The module factory of `jest.mock()` is not allowed to
// reference any out-of-scope variables.

// CORRECT — inline the value
jest.mock('./userService', () => ({
  getUser: jest.fn(() => ({ id: 1, name: 'Alice' })),
}));

// CORRECT — use `mock` prefix (Jest's special exception)
const mockUser = { id: 1, name: 'Alice' };
jest.mock('./userService', () => ({
  getUser: jest.fn(() => mockUser), // works with `mock` prefix
}));
```

### Rule: Use jest.requireActual for Partial Module Mocking

When mocking only some exports, spread `jest.requireActual` to keep the rest real.

```javascript
// INCORRECT — all exports except fetchUser are undefined
jest.mock('./api', () => ({
  fetchUser: jest.fn(),
}));

// CORRECT
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  fetchUser: jest.fn(),
}));
```

### Rule: What to Mock and What Not to Mock

Mock things that are **external, slow, non-deterministic, or have side effects**. Do not mock things that are **internal, fast, deterministic, and pure**.

```javascript
// MOCK: External boundaries
jest.mock('./api-client');     // HTTP calls
jest.mock('./db');             // Database
jest.useFakeTimers();          // Date/time
jest.spyOn(Math, 'random').mockReturnValue(0.5); // Randomness

// DON'T MOCK: Internal logic
// BAD — mocking a utility you own
jest.mock('./utils/formatCurrency'); // tests nothing real

// BAD — mocking the function under test
jest.spyOn(userService, 'validateAge');
userService.validateAge(25);
expect(userService.validateAge).toHaveBeenCalled(); // tautological
```

**Decision framework**: Draw a line around your unit under test. Mock everything that crosses that line outward (DB, HTTP, filesystem, clock). Don't mock anything inside it (pure functions, mappers, validators, data structures).

```javascript
// BAD: Over-mocked — proves nothing
jest.mock('./userRepository');
jest.mock('./validator');
jest.mock('./mapper');
// All internal logic is mocked away

// GOOD: Only mock the external boundary
jest.mock('./userRepository');
test('creates user with validation', async () => {
  userRepository.save.mockResolvedValue({ id: 1, name: 'Alice' });
  const result = await userService.createUser({ name: 'Alice' });
  // Tests real validation, real mapping, real business logic
  expect(result).toEqual({ id: 1, name: 'Alice' });
});
```

---

## 2. Async Testing
**Impact: CRITICAL**

### Rule: Always Return/Await Promises

If an async test does not `await` or `return` its promise, Jest considers it synchronous. An assertion inside `.then()` does not run inside the test: the test passes with zero assertions, or, when the promise was already resolved, a failing assertion becomes an uncaught error that takes down the run.

```javascript
// INCORRECT — missing await
test('fetches user', () => {
  fetchUser(1).then(user => {
    expect(user.name).toBe('Alice'); // does not run inside the test
  });
});

// CORRECT
test('fetches user', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Alice');
});

// CORRECT — .resolves
test('fetches user', async () => {
  await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: 'Alice' });
});
```

### Rule: Use expect.assertions(n) for Async Guards

`expect.assertions(n)` catches tests that silently skip assertions in async code paths.

```javascript
// INCORRECT — if fetchUser resolves, catch never runs, test passes vacuously
test('handles error', async () => {
  try {
    await fetchUser(-1);
  } catch (error) {
    expect(error.message).toMatch('not found');
  }
});

// CORRECT
test('handles error', async () => {
  expect.assertions(1);
  try {
    await fetchUser(-1);
  } catch (error) {
    expect(error.message).toMatch('not found');
  }
});

// BETTER — use .rejects
test('handles error', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('not found');
});
```

### Rule: Wrap expect in try/catch When Using done Callback

A failing `expect` throws, preventing `done()` from being called. The test waits out the full timeout (5 s by default); then Jest reports the assertion error and a second, timeout failure.

```javascript
// INCORRECT — fails only after the 5 s timeout
test('callback test', (done) => {
  fetchUser(1, (err, user) => {
    expect(user.name).toBe('Alice');
    done();
  });
});

// CORRECT
test('callback test', (done) => {
  fetchUser(1, (err, user) => {
    try {
      expect(user.name).toBe('Alice');
      done();
    } catch (e) {
      done(e);
    }
  });
});
```

Prefer async/await over `done`; Jest still supports `done` for callback-based APIs. Never combine them — Jest throws if the same test function takes `done` and returns a promise.

---

## 3. Matcher Usage
**Impact: HIGH**

### Rule: toBe vs toEqual vs toStrictEqual

```javascript
// INCORRECT — toBe compares by reference
expect(getUser()).toBe({ name: 'Alice' }); // FAILS

// CORRECT
expect(getUser()).toEqual({ name: 'Alice' });
expect(getUser()).toStrictEqual({ name: 'Alice' }); // stricter: checks undefined props + class
```

| Matcher | Reference check | Deep compare | Checks undefined props | Checks class |
|---|---|---|---|---|
| `toBe` | Yes (`Object.is`) | No | N/A | N/A |
| `toEqual` | No | Yes | No | No |
| `toStrictEqual` | No | Yes | Yes | Yes |

Use `toBe` for primitives, `toStrictEqual` for objects (default choice), `toEqual` when you intentionally ignore `undefined` properties.

Jest 30: "Non-enumerable object properties are now excluded from object matchers by default. This could affect `expect.objectContaining` or equality checks." Jest 30 also removed the deprecated aliases — `toBeCalled`, `toBeCalledTimes`, `toBeCalledWith`, `lastCalledWith`, `nthCalledWith`, `toReturn`, `toReturnTimes`, `toReturnWith`, `lastReturnedWith`, `nthReturnedWith`, `toThrowError` — use the canonical `toHaveBeen…` / `toHaveReturned…` names and `toThrow`. And `expect.arrayOf(matcher)` asserts *every* element matches, where `expect.arrayContaining([...])` asserts the array merely *includes* the listed items.

### Rule: Use toBeCloseTo for Floats

```javascript
// INCORRECT — 0.1 + 0.2 = 0.30000000000000004
expect(0.1 + 0.2).toBe(0.3); // FAILS

// CORRECT
expect(0.1 + 0.2).toBeCloseTo(0.3);
expect(calculateTax(100, 0.07)).toBeCloseTo(7.0, 2);
```

### Rule: Wrap Throwing Code in Arrow Function for toThrow

```javascript
// INCORRECT — executes immediately
expect(validateAge(-1)).toThrow(); // UNCAUGHT ERROR

// CORRECT — wrap in arrow function
expect(() => validateAge(-1)).toThrow('Age must be positive');

// For async: pass promise directly, use .rejects
await expect(fetchUser(null)).rejects.toThrow('Invalid');
```

---

## 4. Timer Mocking
**Impact: HIGH**

### Rule: Use runOnlyPendingTimers for Recursive Timers

`jest.runAllTimers()` throws `Aborting after running 100000 timers, assuming an infinite loop!` when timer callbacks schedule new timers.

```javascript
// INCORRECT — a timer callback that schedules a new timer
jest.useFakeTimers();
startTicker();
jest.runAllTimers(); // throws after 100000 timers

// CORRECT
jest.runOnlyPendingTimers(); // one cycle at a time
// or
jest.advanceTimersByTime(3000); // precise control

// If the recursive timer is scheduled inside a promise callback, the sync
// methods see nothing queued yet — use the async variants:
await jest.runOnlyPendingTimersAsync();
await jest.advanceTimersByTimeAsync(3000);
```

### Rule: Use Async Timer Methods When Promises Are Involved

Synchronous timer methods don't flush the microtask queue. When code mixes timers with promises, use async variants.

```javascript
// INCORRECT — promises not flushed
jest.advanceTimersByTime(1000);

// CORRECT (Jest 29.5+)
await jest.advanceTimersByTimeAsync(1000);
await jest.runOnlyPendingTimersAsync();
```

### Rule: Use doNotFake to Leave Specific APIs Real

```javascript
// INCORRECT — performance is faked, so timing real I/O reads 0 ms
jest.useFakeTimers();

// CORRECT
jest.useFakeTimers({ doNotFake: ['performance'] });
// `doNotFake` accepts 16 values, including nextTick, hrtime, requestAnimationFrame,
// cancelAnimationFrame, requestIdleCallback, cancelIdleCallback and Temporal —
// see rules/timer-selective-faking.md for the full list.
```

---

## 5. Test Structure
**Impact: HIGH**

### Rule: beforeEach/afterEach Are Scoped to describe Blocks

Hooks inside a `describe` only run for tests in that block. Top-level hooks run for every test in the file.

```javascript
describe('user service', () => {
  beforeEach(() => db.clear()); // only for user service tests
  test('creates user', () => { /* ... */ });
});

describe('math utils', () => {
  test('adds numbers', () => { /* ... */ }); // db.clear() does NOT run
});
```

### Rule: Each Test Must Be Independent

Tests sharing mutable state break when run in different order or individually.

```javascript
// INCORRECT
const items = [];
test('adds', () => { items.push('a'); expect(items).toHaveLength(1); });
test('adds more', () => { items.push('b'); expect(items).toHaveLength(2); }); // order-dependent

// CORRECT
let items;
beforeEach(() => { items = []; });
test('adds', () => { items.push('a'); expect(items).toHaveLength(1); });
test('adds more', () => { items.push('b'); expect(items).toHaveLength(1); });
```

### Rule: Tests Must Be Defined Synchronously

Jest discovers tests by running the file synchronously. Tests inside async callbacks never run, and the file fails with "Your test suite must contain at least one test." or, when it also has a synchronous test, "Cannot add a test after tests have started running. Tests must be defined synchronously."

```javascript
// INCORRECT — tests never run
(async () => {
  const cases = await loadCases();
  cases.forEach(c => test(c.name, () => { /* ... */ }));
})();

// CORRECT — use test.each with synchronous data
const cases = require('./cases.json');
test.each(cases)('$name', ({ input, expected }) => {
  expect(transform(input)).toBe(expected);
});
```

---

## 6. Module Mocking
**Impact: MEDIUM**

### Rule: __mocks__ Directory Conventions

| Module type | Mock location | Auto-used? |
|---|---|---|
| User module (`./utils/helpers`) | `./utils/__mocks__/helpers.js` | No — needs `jest.mock()` |
| Node module (`axios`) | `<rootDir>/__mocks__/axios.js` | Yes |
| Scoped (`@scope/pkg`) | `__mocks__/@scope/pkg.js` | Yes |
| Core Node module (`fs`, `path`) | `<rootDir>/__mocks__/fs.js` | No — `jest.mock('fs')` required; built-ins are not mocked by default |

### Rule: Use jest.unstable_mockModule for ESM

`jest.mock` "does *not* apply when the resolved file is ESM - `jest.mock` is for CJS targets". For native ESM, use `jest.unstable_mockModule` + dynamic `import()`, and import the `jest` object explicitly — it is not a global in ESM. On Node 24.9+, `automock: true` also generates automocks for ES modules (static `import` and `import()`), and a sibling `__mocks__` file replaces the automock; on Node 22 that fails with `Attempting to import a mock without a factory`. A graph with top-level `await` still needs `jest.unstable_mockModule`.

```javascript
import { jest } from '@jest/globals'; // or import.meta.jest — same object

jest.unstable_mockModule('./api.mjs', () => ({
  fetchUser: jest.fn(),
}));

test('ESM mock', async () => {
  const { fetchUser } = await import('./api.mjs');
  fetchUser.mockReturnValue({ id: 1 });
  expect(fetchUser()).toEqual({ id: 1 });
});

// Undo it with the ESM counterpart to jest.unmock
jest.unstable_unmockModule('./api.mjs');
const originalModule = await import('./api.mjs');
```

### Rule: jest.doMock + resetModules for Per-Test Mocks

`jest.mock()` is hoisted and file-wide. `jest.doMock()` is not hoisted — use it for per-test mocking.

```javascript
beforeEach(() => jest.resetModules());

test('test config', () => {
  jest.doMock('./config', () => ({ env: 'test' }));
  const config = require('./config');
  expect(config.env).toBe('test');
});

test('prod config', () => {
  jest.doMock('./config', () => ({ env: 'production' }));
  const config = require('./config');
  expect(config.env).toBe('production');
});
```

---

## 7. Snapshot Testing
**Impact: MEDIUM**

### Rule: Keep Snapshots Small and Focused

Large snapshots get rubber-stamp updated. Prefer specific matchers, then inline snapshots, then small external snapshots.

```javascript
// INCORRECT — 500-line snapshot
expect(renderer.create(<Page />).toJSON()).toMatchSnapshot();

// CORRECT — targeted
expect(getByTestId('greeting')).toMatchSnapshot();
expect(formatGreeting('Alice')).toMatchInlineSnapshot(`"Hello, Alice!"`);

// BEST — specific matcher
expect(getByText('Hello, Alice!')).toBeInTheDocument();
```

### Rule: Use Property Matchers for Dynamic Fields

```javascript
expect(createUser({ name: 'Alice' })).toMatchSnapshot({
  id: expect.any(String),
  createdAt: expect.any(Date),
});
// Snapshot pins name: "Alice" but allows any String id and any Date createdAt
```

### Rule: Mock Non-Deterministic Values

```javascript
jest.useFakeTimers({ now: new Date('2024-01-01') });
jest.spyOn(Math, 'random').mockReturnValue(0.5);
jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000001');
```

---

## 8. Configuration
**Impact: MEDIUM**

### Rule: Set Per-Directory Coverage Thresholds

Global thresholds average coverage across the codebase. Per-directory thresholds enforce higher standards where it matters.

```javascript
module.exports = {
  coverageThreshold: {
    global: { branches: 70, functions: 70, lines: 70, statements: 70 },
    './src/payments/': { branches: 90, lines: 95 },
    './src/auth/': { branches: 85, lines: 90 },
  },
};
```

### Rule: Configure transformIgnorePatterns for ESM Packages

The default `['/node_modules/', '\\.pnp\\.[^\\/]+$']` skips `node_modules/` and Yarn PnP files. A CJS test that `require()`s an ESM-only package (uuid v12+) fails with `Must use import to load ES Module`. Add a negative lookahead, and overriding replaces the whole array — carry the PnP entry over. The pattern alone is not enough: a project-wide `babel.config.js` must compile ESM to CommonJS (`@babel/preset-env`); the default `babel-jest` and a `.babelrc` do not. On Node.js 24.9+, `NODE_OPTIONS=--experimental-vm-modules` lets Jest `require()` the ES module with no transform.

```javascript
module.exports = {
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|nanoid|chalk)/)',
    '\\.pnp\\.[^\\/]+$',
  ],
};
```

### Rule: Per-File @jest-environment Docblock

Default to `'node'` globally. Use docblock for files that need DOM.

```javascript
// jest.config.js
module.exports = { testEnvironment: 'node' };

// Component test file:
/**
 * @jest-environment jsdom
 */
```

---

## 9. Performance & CI
**Impact: MEDIUM**

### Rule: --runInBand or --maxWorkers for CI

Default worker count can overwhelm CI containers. Use `--runInBand` for small suites, `--maxWorkers` for control.

```bash
npx jest --runInBand              # serial — best for < 100 tests
npx jest --maxWorkers=2           # fixed workers
npx jest --maxWorkers=50%         # scales with container
npx jest --shard=1/4              # split across CI jobs
```

### Rule: Get Full Output from Jest Inside an AI Agent

Since Jest 30.3, when an agent environment variable such as `AI_AGENT`, `CLAUDECODE`, `CURSOR_AGENT` or `GEMINI_CLI` is set and the config has no `reporters`, Jest uses an agent reporter: it prints only the files with failures (with their console output) and the summary. Passing files and their `console.log` output do not appear. To see them, pass `--reporters=default` or set `reporters` in the config.

```bash
npx jest --reporters=default   # full per-file output inside an agent shell
```

### Rule: jest.isolateModules for Per-Test Module State

`jest.isolateModules` creates a sandboxed module registry without affecting other tests.

```javascript
test('fresh module', () => {
  jest.isolateModules(() => {
    jest.doMock('./config', () => ({ debug: true }));
    const app = require('./app');
    expect(app.isDebug()).toBe(true);
  });
});
```

`jest.isolateModules` takes a synchronous callback; for ESM or any async work inside the sandbox use `jest.isolateModulesAsync` and `await` it, or the registry is restored before the callback settles.

```javascript
await jest.isolateModulesAsync(async () => {
  const mod = await import('./counter');
});
```

---

## Quick Reference: Mock Cleanup

```javascript
// jest.config.js (recommended): restoreMocks alone keeps call history
module.exports = { clearMocks: true, restoreMocks: true };

// Manual
afterEach(() => jest.restoreAllMocks());
```

## Quick Reference: Async Testing

```javascript
// Always await
test('async', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// Guard with assertions count
test('error handling', async () => {
  expect.assertions(1);
  await expect(badCall()).rejects.toThrow('error');
});
```

## Quick Reference: Timer Mocking

```javascript
jest.useFakeTimers();
// Use async variants when code mixes timers + promises:
await jest.advanceTimersByTimeAsync(1000);
// Restore:
jest.useRealTimers();
```

## Quick Reference: Matchers

| Need | Matcher |
|------|---------|
| Primitive equality | `toBe` |
| Deep object equality | `toStrictEqual` |
| Loose deep equality | `toEqual` |
| Float comparison | `toBeCloseTo` |
| Error thrown | `expect(() => fn()).toThrow()` |
| Promise resolves | `await expect(p).resolves.toBe()` |
| Promise rejects | `await expect(p).rejects.toThrow()` |
| Mock called | `toHaveBeenCalledWith()` |
| Partial object match | `toMatchObject()` |
| Array contains | `toContain()` / `toContainEqual()` |
