---
title: Wrap expect in try/catch when using done callback
impact: HIGH
description: When using the done callback pattern, a failing expect throws and done is never called, causing the test to time out instead of reporting the actual assertion failure.
tags: async, done, callback, try-catch, timeout
---

# Wrap expect in try/catch when using done callback

## Problem

When using Jest's `done` callback for async tests, a failing `expect()` throws an error. If the error is not caught, `done()` is never called. Jest 30 still reports the assertion error, but only after the test has waited out the full timeout (5 seconds by default), and it adds a second failure for the timeout. Every broken callback test then costs the full timeout, and the report mixes the real failure with a timeout failure.

## Incorrect

```javascript
// BUG: If expect fails, done() is never called — test times out after 5s
test('calls callback with data', (done) => {
  fetchUser(1, (error, user) => {
    expect(user.name).toBe('Alice'); // if this fails, it throws
    done(); // never reached
  });
});
// Output, after 5 s: the assertion error, then
// "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called."
```

## Correct

```javascript
test('calls callback with data', (done) => {
  fetchUser(1, (error, user) => {
    try {
      expect(error).toBeNull();
      expect(user.name).toBe('Alice');
      done();
    } catch (e) {
      done(e); // passes the error to Jest — shows the real failure message
    }
  });
});
```

```javascript
// Better: Convert callback to promise and use async/await
test('calls callback with data', async () => {
  const user = await new Promise((resolve, reject) => {
    fetchUser(1, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
  expect(user.name).toBe('Alice');
});
```

## Why

- `done(error)` tells Jest the test failed and provides the actual error message.
- `done()` with no argument tells Jest the test passed.
- If neither is called, Jest waits for the full timeout before it reports the failure.

**Prefer async/await over `done`**. The `done` callback pattern exists for legacy callback-based APIs. Modern code should promisify callbacks and use `async`/`await`, which eliminates this entire class of bugs. Jest still supports `done` — upstream treats callbacks, promises and async/await as equally valid: "None of these forms is particularly superior to the others." The one hard rule is that they cannot be combined: "Jest will throw an error, if the same test function is passed a `done()` callback and returns a promise."

```javascript
// FAILS: "Test functions cannot both take a 'done' callback and return something."
// @ts-expect-error a test function cannot both take done and return a promise
test('either/or, never both', async (done) => {
  done();
});
```
