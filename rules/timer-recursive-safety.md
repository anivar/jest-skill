---
title: Use runOnlyPendingTimers for recursive timers
impact: HIGH
description: jest.runAllTimers enters an infinite loop when code schedules new timers inside timer callbacks (e.g., recursive setTimeout). Use runOnlyPendingTimers instead.
tags: timer, runAllTimers, runOnlyPendingTimers, recursive, setTimeout, infinite-loop
---

# Use runOnlyPendingTimers for recursive timers

## Problem

`jest.runAllTimers()` runs all pending timers, including any new timers created during execution. If a timer callback schedules another timer (common in polling, retry, and animation patterns), `runAllTimers` enters an infinite loop and the test hangs or crashes with a max recursion error.

## Incorrect

```javascript
// BUG: poll() schedules a new setTimeout each time — runAllTimers loops forever
function poll(callback) {
  fetchData().then(data => {
    callback(data);
    setTimeout(() => poll(callback), 1000); // recursive timer
  });
}

test('polls for data', () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  poll(cb);
  jest.runAllTimers(); // INFINITE LOOP — hangs or throws "Aborting after running 100000 timers"
});
```

## Correct

`poll()` schedules its `setTimeout` **inside** a `.then()`, so the timer does not
exist until the promise callback has run. The synchronous timer methods do not
flush promise callbacks, so at the moment they are called there is nothing
queued. Use the async variants, which run scheduled promise callbacks before
advancing the clock — and note the counts include the call from the initial
fetch, not just the timer-driven ones.

```javascript
test('polls for data', async () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  poll(cb);

  // Async variant: lets the pending promise callback run, so the first result
  // is delivered and the next timer is queued.
  await jest.runOnlyPendingTimersAsync();
  expect(cb).toHaveBeenCalledTimes(2);

  await jest.runOnlyPendingTimersAsync();
  expect(cb).toHaveBeenCalledTimes(3);
});
```

```javascript
// Alternative: advanceTimersByTimeAsync for precise control
test('polls every second', async () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  poll(cb);

  await jest.advanceTimersByTimeAsync(3000);
  expect(cb).toHaveBeenCalledTimes(4); // 1 from the initial fetch + 3 timer-driven
});
```

## Decision Table

| Method | Behavior | Safe for recursive timers |
|---|---|---|
| `runAllTimers()` | Runs all timers including newly created ones | No — infinite loop |
| `runOnlyPendingTimers()` | Runs only timers in the queue at call time | Yes, but does not flush promise callbacks |
| `advanceTimersByTime(ms)` | Advances clock by `ms`, running timers that fire | Yes, but does not flush promise callbacks |
| `advanceTimersToNextTimer()` | Advances to the next timer and runs it | Yes, but does not flush promise callbacks |
| `runOnlyPendingTimersAsync()` | Asynchronous equivalent of `runOnlyPendingTimers()`; allows scheduled promise callbacks to execute before running the timers | Yes — use when the timer is scheduled inside a promise callback |
| `advanceTimersByTimeAsync(ms)` | Asynchronous equivalent of `advanceTimersByTime(ms)`; allows scheduled promise callbacks to execute | Yes — use when the timer is scheduled inside a promise callback |

## Why

Recursive timers are extremely common: `setInterval`, polling loops, retry-with-backoff, `requestAnimationFrame` polyfills, and debounce/throttle implementations all create new timers from within timer callbacks. Always use `runOnlyPendingTimers` or `advanceTimersByTime` unless you are certain no recursive timers exist.
