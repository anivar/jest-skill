---
title: Always restore jest.spyOn; prefer restoreMocks config
impact: CRITICAL
description: Spies replace real implementations and must be restored after each test to prevent cross-test contamination.
tags: mock, spyOn, restore, restoreMocks, afterEach
---

# Always restore jest.spyOn; prefer restoreMocks config

## Problem

`jest.spyOn` replaces a method on an existing object with a mock. If you forget to restore it, every subsequent test in the file sees the mocked version. This causes mysterious failures when tests run in a different order or when a new test is added.

## Incorrect

```javascript
// BUG: spy is never restored — console.error is mocked for all remaining tests
test('suppresses error output', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  doSomethingThatLogs();
  expect(console.error).toHaveBeenCalled();
});

test('later test', () => {
  // console.error is still mocked — real errors are silently swallowed
  triggerRealError(); // no output, bug hidden
});
```

## Correct

```javascript
// Option 1: Manual restore
afterEach(() => {
  jest.restoreAllMocks();
});

test('suppresses error output', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  doSomethingThatLogs();
  expect(console.error).toHaveBeenCalled();
});

test('later test', () => {
  // console.error is real again
  triggerRealError(); // errors print normally
});
```

```javascript
// Option 2: Config-level (preferred)
// jest.config.js
module.exports = {
  clearMocks: true,   // restoreMocks alone keeps call history between tests
  restoreMocks: true,
};
```

```javascript
// Option 3: `using` for a scope-bound spy — the runtime must support `using`
// (see the note at the end of this rule)
test('logs a warning', () => {
  using spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  console.warn('watch out');
  expect(spy).toHaveBeenCalled();
}); // spy.mockRestore() runs on block exit — including when the assertion throws
```

## Why

Setting `restoreMocks: true` in config, together with `clearMocks: true`, is the safest approach because:

1. It applies globally — no test file can forget.
2. It restores the original implementation, not just a no-op `jest.fn()`.
3. It covers `jest.spyOn` and `jest.replaceProperty`. It does **not** cover methods you
   replaced by hand with `jest.fn()`. Upstream: "`jest.restoreAllMocks()` only works for
   mocks created with `jest.spyOn()` and properties replaced with `jest.replaceProperty()`;
   other mocks will require you to manually restore them." Observed on jest 30.4.1 with
   `restoreMocks: true`: a hand-assigned `obj.method = jest.fn(...)` is left completely
   untouched between tests — still the fake, still carrying its implementation. Prefer
   `jest.spyOn(obj, 'method')` over manual assignment so restore applies.
4. It does not clear call history. A restored spy keeps its calls, and so does every
   `jest.fn`; `clearMocks: true` clears them before each test.

If you only need the spy for a single assertion, use the spy's own `.mockRestore()`:

```javascript
test('one-off spy', () => {
  const spy = jest.spyOn(fs, 'readFileSync').mockReturnValue('data');
  expect(readConfig()).toBe('data');
  spy.mockRestore(); // restored immediately
});
```

That trailing line is skipped if the assertion throws — which is what Option 3 above fixes.
Upstream describes `using` as "semantically equal" to a `try`/`finally` that calls
`spy.mockRestore()`. It also works with a bare block, which scopes the spy to part of a test:

```javascript
test('testing something', () => {
  {
    using spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupStepThatWillLogAWarning();
  }
  // here, console.warn is already restored to the original value
});
```

Keep `clearMocks: true` with `restoreMocks: true` as the default. `using` needs a runtime that supports it. With the
default `babel-jest` on Jest 30.5.2, it runs on Node 24.22.1 and 26.12.1, and fails on Node
22.23.3 with `SyntaxError: Unexpected identifier 'spy'`. On an older runtime, lower it with
TypeScript >= 5.2 or `@babel/plugin-proposal-explicit-resource-management`. If you get a warning
that `Symbol.dispose` does not exist, you also need the polyfill documented upstream.
