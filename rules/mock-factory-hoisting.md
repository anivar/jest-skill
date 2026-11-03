---
title: jest.mock factory cannot reference outer variables
impact: CRITICAL
description: Jest hoists jest.mock() calls above imports, so factory functions cannot reference variables declared in the module scope.
tags: mock, hoisting, factory, jest.mock, scope
---

# jest.mock factory cannot reference outer variables

## Problem

Calls to `jest.mock()` are hoisted to the top of the file, so it is not possible to first define a variable and then use it in the factory. Jest makes an exception for variables whose name starts with the word `mock`. `babel-plugin-jest-hoist` also accepts a `const` whose initializer is pure (a literal, or an object or array of literals) and moves that declaration up with the `jest.mock()` call. A variable set by a function call is rejected when the file is transformed.

## Incorrect

```javascript
// BUG: `fakeUser` does not start with `mock` and is set by a function call,
// so the transform rejects the factory
const { buildUser } = require('./factories');
const fakeUser = buildUser({ name: 'Alice' });

jest.mock('./userService', () => ({
  getUser: jest.fn(() => fakeUser),
}));
// ReferenceError: The module factory of `jest.mock()` is not allowed to
// reference any out-of-scope variables.
// Invalid variable access: fakeUser
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

The `mock` prefix exception exists specifically for this hoisting issue. Jest's Babel plugin accepts any name that matches `/^mock/i` (`mockUser`, `mocked` and `MockUser` all pass), and a `const` with a pure initializer. It does not move a `mock`-prefixed declaration. Upstream: "it is still up to you to guarantee that they will be initialized on time. Be aware of Temporal Dead Zone." This is fragile:

- A name such as `my_mock` or `fakeUser` is rejected unless its initializer is pure.
- A factory that reads a `mock` variable while the factory runs, not later inside a returned function, depends on when the module is first required.

**Safest approach**: Define the mock return value inside individual tests using `mockReturnValue` or `mockImplementation`, not in the factory.
