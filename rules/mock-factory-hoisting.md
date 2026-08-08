---
title: jest.mock factory cannot reference outer variables
impact: CRITICAL
description: Jest hoists jest.mock() calls above imports, so factory functions cannot reference variables declared in the module scope.
tags: mock, hoisting, factory, jest.mock, scope
---

# jest.mock factory cannot reference outer variables

## Problem

Calls to `jest.mock()` are hoisted to the top of the file, so it is not possible to first define a variable and then use it in the factory. Jest makes an exception for variables whose name starts with the word `mock`.

## Incorrect

```javascript
// BUG: `fakeUser` does not start with `mock`, so the factory may not reference it
const fakeUser = { id: 1, name: 'Alice' };

jest.mock('./userService', () => ({
  getUser: jest.fn(() => fakeUser),
}));
```

## Correct

```javascript
// Option 1: Inline the value inside the factory
jest.mock('./userService', () => ({
  getUser: jest.fn(() => ({ id: 1, name: 'Alice' })),
}));
```

```javascript
// Option 2: Use a variable prefixed with `mock` — Jest's special exception
const mockUser = { id: 1, name: 'Alice' };

jest.mock('./userService', () => ({
  getUser: jest.fn(() => mockUser),
}));
// Works because Jest makes an exception for variables whose name begins with `mock`.
```

```javascript
// Option 3: Set the return value inside each test instead
jest.mock('./userService');
const { getUser } = require('./userService');

test('returns user', () => {
  getUser.mockReturnValue({ id: 1, name: 'Alice' });
  // ...
});
```

## Why

The `mock` prefix exception exists specifically for this hoisting issue. Jest's Babel plugin detects variables starting with `mock` and allows them in the hoisted scope. However, this is fragile:

- Misspelling the prefix (e.g., `mocked`, `my_mock`) breaks the exception.
- The variable is still uninitialized if it depends on other imports.

**Safest approach**: Define the mock return value inside individual tests using `mockReturnValue` or `mockImplementation`, not in the factory.
