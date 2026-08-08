---
title: Use jest.unstable_mockModule for ESM
impact: MEDIUM
description: jest.mock() does not work with native ES modules. Use jest.unstable_mockModule with dynamic import() for ESM mocking.
tags: module, esm, unstable_mockModule, import, dynamic-import
---

# Use jest.unstable_mockModule for ESM

## Problem

`jest.mock()` relies on CommonJS hoisting semantics. In native ES module mode (`"type": "module"` or `.mjs` files), `jest.mock()` cannot hoist above static `import` statements. The mock is registered after the module is already imported, so the real module is used instead.

Hoisting order is not the only problem. Upstream: "`jest.mock` does *not* apply when the resolved file is ESM - `jest.mock` is for CJS targets." Since Node v24.9 Jest supports `require()`-ing an ES module from CJS code, so a `.cjs` test file *can* `require()` an `.mjs` module — CJS hoisting works fine there and `jest.mock` still will not mock it. The determining factor is the format of the resolved module, not the mode of the test file.

In native ESM the `jest` object is also not a global: "To access this object in ESM, you need to import it from the `@jest/globals` module or use `import.meta`" — `jest === import.meta.jest`. `describe`/`test`/`expect` still arrive as globals, which is why only the `jest.*` calls fail with `ReferenceError: jest is not defined`.

## Incorrect

```javascript
// BUG: jest.mock does not work with static ESM imports
import { fetchUser } from './api.mjs';

jest.mock('./api.mjs'); // too late — import already resolved

test('mocks fetchUser', () => {
  fetchUser.mockReturnValue({ id: 1 }); // TypeError: mockReturnValue is not a function
});
```

## Correct

```javascript
// Use jest.unstable_mockModule + dynamic import
import { jest } from '@jest/globals'; // `jest` is not a global in ESM

beforeEach(async () => {
  jest.unstable_mockModule('./api.mjs', () => ({
    fetchUser: jest.fn(),
  }));
});

test('mocks fetchUser', async () => {
  const { fetchUser } = await import('./api.mjs');
  fetchUser.mockReturnValue({ id: 1 });
  expect(fetchUser()).toEqual({ id: 1 });
});
```

```javascript
// With partial mocking — resolve the real namespace BEFORE registering the mock.
// A factory that imports the module it is mocking re-enters itself; verified on
// jest 30.4.1, that recursion crashes the worker with a heap out-of-memory error.
import { jest } from '@jest/globals';

test('partial ESM mock', async () => {
  const actual = await import('./utils.mjs');

  jest.unstable_mockModule('./utils.mjs', () => ({
    ...actual,
    formatDate: jest.fn(() => '2024-01-01'),
  }));

  const { formatDate, formatCurrency } = await import('./utils.mjs');
  expect(formatDate()).toBe('2024-01-01');
  expect(formatCurrency(5)).toBe('$5'); // real implementation
});
```

```javascript
// Undo a mock: jest.unstable_unmockModule is the ESM counterpart to jest.unmock
import { jest } from '@jest/globals';

jest.unstable_unmockModule('./esm-module.js');
const originalModule = await import('./esm-module.js');
```

## Key Differences from jest.mock

| Feature | `jest.mock` (CJS) | `jest.unstable_mockModule` (ESM) |
|---|---|---|
| Hoisting | Auto-hoisted above imports | Not hoisted |
| Import style | `require()` or static `import` | Must use `await import()` |
| Factory | Synchronous | Required; can be sync or `async` |
| Undo | `jest.unmock` | `jest.unstable_unmockModule` |
| `jest` object | Injected global | Import from `@jest/globals` (or `import.meta.jest`) |
| API stability | Stable | Unstable (API may change) |
| Module resolution | After mock registration | After mock registration |

## Why

- ESM has static module linking — imports are resolved before any code runs, so hoisting is not possible.
- `jest.unstable_mockModule` registers the mock first, then `await import()` resolves against the mock registry.
- The `unstable_` prefix indicates the API may change in future Jest versions, but it is the official approach for ESM mocking.
- If the *target module* is CJS, stick with `jest.mock()` — it's simpler and stable. What matters is the resolved module's format, not whether your test file uses `require`.
