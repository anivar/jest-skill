# Jest Object Reference

The `jest` object is available globally in every test file. It provides methods for mocking, timer control, module manipulation, and test configuration.

## Module Mocking

### `jest.mock(moduleName, factory?, options?)`

Mocks a module. Hoisted to the top of the file automatically.

```javascript
// Auto-mock (all exports become jest.fn())
jest.mock('./api');

// Factory mock
jest.mock('./api', () => ({
  fetchUser: jest.fn(() => ({ id: 1 })),
}));

// Virtual module (does not need to exist on disk)
jest.mock('virtual-module', () => ({ key: 'value' }), { virtual: true });
```

### `jest.unmock(moduleName)`

Undoes `jest.mock` — the real module is used. Also hoisted.

### `jest.doMock(moduleName, factory?, options?)`

Same as `jest.mock` but **not hoisted**. Use for per-test mocking with `jest.resetModules()`.

### `jest.dontMock(moduleName)`

Same as `jest.unmock` but not hoisted.

### `jest.resetModules()`

Clears the module registry cache. The next `require()` loads a fresh copy.

```javascript
beforeEach(() => {
  jest.resetModules();
});
```

### `jest.isolateModules(fn)`

Creates a sandboxed module registry for the duration of `fn`. Registry is restored after `fn` completes.

```javascript
jest.isolateModules(() => {
  jest.doMock('./config', () => ({ debug: true }));
  const app = require('./app'); // fresh, isolated instance
});
```

### `jest.isolateModulesAsync(fn)`

The equivalent of `jest.isolateModules()` for async callbacks — the caller is expected to
`await` it. Use this whenever the callback does a dynamic `import()` or any other async work.

```javascript
await jest.isolateModulesAsync(async () => {
  const mod = await import('./counter');
  // async work here
});
```

### `jest.requireActual(moduleName)`

Returns the real module, bypassing any mocks. Used inside `jest.mock` factories for partial mocking.

```javascript
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  fetchUser: jest.fn(),
}));
```

### `jest.requireMock(moduleName)`

Returns the mock version of a module, even if `jest.mock` was not called (uses auto-mocking).

### `jest.createMockFromModule(moduleName)`

Creates an auto-mocked version of a module. Useful in manual mock files (`__mocks__/`).

```javascript
const utils = jest.createMockFromModule('./utils');
utils.format.mockReturnValue('formatted');
module.exports = utils;
```

### `jest.onGenerateMock(callback)`

Registers a callback invoked whenever Jest auto-generates a module mock, so you can patch the
generated mock centrally (typically from `setupFilesAfterEnv`) instead of repeating the same
factory in every test file. Callbacks run in registration order, each receiving the previous
callback's output as `moduleMock`.

```javascript
jest.onGenerateMock((modulePath, moduleMock) => {
  if (modulePath.includes('Database')) {
    moduleMock.connect = jest.fn();
  }
  return moduleMock;
});
```

It is **not** called for manually created mocks — neither `__mocks__` files nor explicit
`jest.mock('moduleName', () => { ... })` factories.

## ESM Mocking

### `jest.unstable_mockModule(moduleName, factory, options?)`

Mocks a module for ES module imports. Must be called before `await import()`.

```javascript
jest.unstable_mockModule('./api.mjs', () => ({
  fetchUser: jest.fn(),
}));

const { fetchUser } = await import('./api.mjs');
```

In ESM the `jest` object is not a global — `import { jest } from '@jest/globals'` (or use
`import.meta.jest`).

### `jest.unstable_unmockModule(moduleName)`

The ESM counterpart to `jest.unmock` — undoes an `unstable_mockModule` (or an automock) so a
subsequent dynamic `import()` resolves the real module.

```javascript
jest.unstable_unmockModule('./esm-module.js');
const originalModule = await import('./esm-module.js');
```

## Timer Mocking

### `jest.useFakeTimers(config?)`

Replaces timer globals with fakes.

```javascript
jest.useFakeTimers();
jest.useFakeTimers({ now: new Date('2024-01-01') }); // fixed Date.now
jest.useFakeTimers({ doNotFake: ['Date', 'performance'] }); // selective (default: [])
jest.useFakeTimers({ timerLimit: 1000 }); // max timers before error (default 100_000)
jest.useFakeTimers({ advanceTimers: true }); // auto-advance 20ms every 20ms; pass a number for a custom delta (default false)
jest.useFakeTimers({ legacyFakeTimers: true }); // pre-@sinonjs implementation (default false)
```

The async timer methods, `jest.setSystemTime`, `jest.getRealSystemTime`,
`jest.advanceTimersToNextFrame` and `jest.setTimerTickMode` are all documented as unavailable
under legacy fake timers.

### `jest.useRealTimers()`

Restores real timer implementations.

### Timer Advancement

| Method | Behavior |
|---|---|
| `jest.runAllTimers()` | Runs all pending timers recursively (unsafe for recursive timers) |
| `jest.runOnlyPendingTimers()` | Runs only currently pending timers |
| `jest.advanceTimersByTime(ms)` | Advances clock by `ms`, firing timers along the way |
| `jest.advanceTimersToNextTimer(steps?)` | Advances to the next timer (optionally repeat `steps` times) |
| `jest.advanceTimersToNextFrame()` | Advances timers by just enough milliseconds to execute callbacks currently scheduled with `requestAnimationFrame` (animation frames run every 16ms of fake clock). Not available with legacy fake timers |

### Async Timer Methods (Jest 29.5+)

Same as above but flush microtask queue between timer executions:

```javascript
await jest.runAllTimersAsync();
await jest.runOnlyPendingTimersAsync();
await jest.advanceTimersByTimeAsync(1000);
await jest.advanceTimersToNextTimerAsync();
```

### Timer Inspection

```javascript
jest.getTimerCount();      // number of pending timers
jest.now();                // current fake clock time (ms)
jest.setSystemTime(date);  // set fake clock to specific time
jest.getRealSystemTime();  // real Date.now() even when faked
```

### `jest.setTimerTickMode(mode)`

Configures how fake timers advance time, without tearing down and reinstalling them. Not
available with legacy fake timers.

```javascript
jest.setTimerTickMode({ mode: 'manual' });               // default: only the tick APIs advance the clock
jest.setTimerTickMode({ mode: 'nextAsync' });            // break the event loop, run the next timer, repeat
jest.setTimerTickMode({ mode: 'interval', delta: 20 });  // same as `advanceTimers: true`; delta defaults to 20
```

Useful mid-test when the code under test awaits a timer: switch to `nextAsync`, `await`, then
switch back to `manual`.

## Mock Cleanup

```javascript
jest.clearAllMocks();      // clear call history
jest.resetAllMocks();      // clear + remove implementations
jest.restoreAllMocks();    // clear + remove + restore originals
```

## Test Configuration

### `jest.setTimeout(milliseconds)`

Sets the default timeout for all tests and hooks in the file.

```javascript
jest.setTimeout(30000); // 30 seconds
```

### `jest.retryTimes(count, options?)`

Retries failed tests up to `count` times. Useful for flaky integration tests.

```javascript
jest.retryTimes(3);
jest.retryTimes(3, { logErrorsBeforeRetry: true }); // log the error that caused each failure
jest.retryTimes(3, { waitBeforeRetry: 1000 });      // ms to wait before retrying
jest.retryTimes(3, { retryImmediately: true });     // retry now instead of after the rest of the file
```

Without `retryImmediately`, "the tests are retried after Jest is finished running all other
tests in the file" — which matters when the flake is order- or state-dependent. Must be declared
at the top level of a test file or in a `describe` block, and only works with the default
`jest-circus` runner.

## Property Replacement

### `jest.replaceProperty(object, propertyKey, value)`

Replaces a property value on an object. Restored by `jest.restoreAllMocks()`.
The property must already exist on the object, so to fake an environment
variable that may be unset, replace `process.env` itself.

```javascript
jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'test' });
// later restored automatically if restoreMocks: true
```

### `jest.spyOn(object, methodName)`

See [Mock Functions Reference](./mock-functions.md).

## Misc

### `jest.mocked(source, options?)`

TypeScript helper — wraps a module or function with mock types.

```javascript
jest.mock('./api');
const api = jest.mocked(require('./api'));
// api.fetchUser is typed as jest.MockedFunction<typeof fetchUser>
```

### `jest.fn(implementation?)`

Creates a mock function. See [Mock Functions Reference](./mock-functions.md).
