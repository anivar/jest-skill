# Module Mocking Reference

## jest.mock — Standard Module Mock

### Auto-mock (no factory)

```javascript
jest.mock('./api');
const { fetchUser } = require('./api');
// fetchUser is now jest.fn() — returns undefined by default
```

Jest auto-generates mocks for all exports: functions become `jest.fn()`, objects are deeply mocked, classes have all methods mocked.

### Factory mock

```javascript
jest.mock('./api', () => ({
  fetchUser: jest.fn(() => ({ id: 1, name: 'Alice' })),
  fetchPosts: jest.fn(() => []),
}));
```

### Partial mock (keep some exports real)

```javascript
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  formatDate: jest.fn(() => '2024-01-01'),
}));
```

### ES module mock (with default export)

```javascript
jest.mock('./config', () => ({
  __esModule: true,
  default: { apiUrl: 'http://test.local' },
  timeout: 5000,
}));
```

## Manual Mocks — `__mocks__` Directory

### User modules

Place mock file adjacent to the real module. **Must** call `jest.mock()` to activate.

```
src/
├── utils/
│   ├── __mocks__/
│   │   └── api.js        ← manual mock
│   └── api.js             ← real module
└── app.test.js
```

```javascript
// app.test.js — must explicitly mock
jest.mock('./utils/api');
```

### Node modules

Place mock at project root adjacent to `node_modules/`. **Auto-activated** — no `jest.mock()` needed, unless you configured `roots` to point somewhere other than the project root. Node **built-in** modules (`fs`, `path`, …) are the exception: they still require an explicit `jest.mock('fs')`.

```
project/
├── __mocks__/
│   └── axios.js           ← auto-used for all tests
├── node_modules/
│   └── axios/
└── src/
```

### Scoped packages

```
__mocks__/
└── @scope/
    └── package.js
```

### Manual mock using createMockFromModule

```javascript
// __mocks__/fs.js
const fs = jest.createMockFromModule('fs');
fs.readFileSync.mockReturnValue('mock content');
module.exports = fs;
```

```javascript
// in the test file — REQUIRED for Node built-ins; they are not mocked by default
jest.mock('fs');
```

Upstream: "If we want to mock Node's built-in modules (e.g.: `fs` or `path`), then explicitly
calling e.g. `jest.mock('path')` is **required**, because built-in modules are not mocked by
default." Without that line the manual mock never activates and the test hits the real
filesystem.

## jest.doMock — Non-Hoisted Mock

Not hoisted above imports — use for per-test mocking.

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

## jest.isolateModules — Sandboxed Registry

Creates an isolated module registry. Modules required inside the callback get fresh instances.

```javascript
test('isolated', () => {
  jest.isolateModules(() => {
    jest.doMock('./config', () => ({ env: 'staging' }));
    const app = require('./app'); // fresh app with staging config
    expect(app.getEnv()).toBe('staging');
  });
  // registry restored — app from other tests unaffected
});
```

## jest.requireActual — Bypass Mocks

Returns the real module even when it's mocked.

```javascript
jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    dangerousFunction: jest.fn(), // only mock this one
  };
});
```

## ESM Mocking — jest.unstable_mockModule

For native ES modules (`import`/`export`). Must use `await import()` after registering the mock.
In ESM the `jest` object is not a global — import it from `@jest/globals` (or use
`import.meta.jest`, which is the same object).

```javascript
import { jest } from '@jest/globals';

jest.unstable_mockModule('./api.mjs', () => ({
  fetchUser: jest.fn(() => ({ id: 1 })),
}));

test('ESM mock', async () => {
  const { fetchUser } = await import('./api.mjs');
  expect(fetchUser()).toEqual({ id: 1 });
});
```

### Partial ESM mock

Resolve the real namespace **before** registering the mock. A factory that `import()`s the
module it is mocking re-enters itself; on jest 30.4.1 that recursion crashes the worker with a
heap out-of-memory error.

```javascript
import { jest } from '@jest/globals';

test('partial ESM mock', async () => {
  const actual = await import('./utils.mjs');

  jest.unstable_mockModule('./utils.mjs', () => ({
    ...actual,
    format: jest.fn(() => 'formatted'),
  }));

  const { format, formatCurrency } = await import('./utils.mjs');
  expect(format()).toBe('formatted');
  expect(formatCurrency(5)).toBe('$5'); // real implementation
});
```

### Undoing an ESM mock

`jest.unstable_unmockModule` is the ESM counterpart to `jest.unmock` — it undoes an
`unstable_mockModule` (or an automock) so a subsequent dynamic `import()` resolves the real
module.

```javascript
import { jest } from '@jest/globals';

jest.unstable_unmockModule('./esm-module.js');
const originalModule = await import('./esm-module.js');
```

## Hoisting Behavior

| API | Hoisted | Use case |
|---|---|---|
| `jest.mock()` | Yes | Standard mocking (most common) |
| `jest.unmock()` | Yes | Undo a mock |
| `jest.doMock()` | No | Per-test mocking |
| `jest.dontMock()` | No | Per-test unmocking |
| `jest.unstable_mockModule()` | No | ESM mocking (factory required) |
| `jest.unstable_unmockModule()` | No | Undo an ESM mock |

### Factory variable restrictions (hoisting)

Calls to `jest.mock()` are hoisted above all imports, so a variable cannot be defined first and
then used in the factory. Jest makes an exception for names beginning with `mock`.

```javascript
// NOT ALLOWED: `fakeData` does not begin with `mock`
const fakeData = { id: 1 };
jest.mock('./api', () => ({ getData: () => fakeData }));

// ALLOWED: Jest makes an exception for variables whose name begins with `mock`
const mockData = { id: 1 };
jest.mock('./api', () => ({ getData: () => mockData }));
```

## Mock Verification

```javascript
jest.mock('./api');
const api = require('./api');

test('calls fetchUser', () => {
  myFunction();
  expect(api.fetchUser).toHaveBeenCalledWith(1);
  expect(api.fetchUser).toHaveBeenCalledTimes(1);
});
```

## Clearing Module Mocks

```javascript
jest.resetModules();  // clear module cache — next require loads fresh
jest.restoreAllMocks(); // restore spied/mocked implementations
```

## TypeScript: Typing Mocked Modules

```typescript
jest.mock('./api');
const { fetchUser } = jest.mocked(require('./api'));
// fetchUser is typed as jest.MockedFunction<typeof fetchUser>

// Or import then cast
import { fetchUser } from './api';
jest.mock('./api');
const mockedFetchUser = jest.mocked(fetchUser);
```
