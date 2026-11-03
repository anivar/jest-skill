---
title: Use runOnlyPendingTimers for recursive timers
impact: HIGH
description: jest.runAllTimers throws after 100000 timers when a timer callback schedules a new timer (e.g., recursive setTimeout). Use runOnlyPendingTimers or advanceTimersByTime instead.
tags: timer, runAllTimers, runOnlyPendingTimers, recursive, setTimeout, infinite-loop
---

# Use runOnlyPendingTimers for recursive timers

## Problem

`jest.runAllTimers()` runs all pending timers, including any new timers created during execution. If a timer callback schedules another timer (common in polling, retry, and animation patterns), `runAllTimers` never runs out of timers. Jest stops it and throws `Aborting after running 100000 timers, assuming an infinite loop!`.

## Incorrect

```javascript
// BUG: tick() schedules the next timer from inside the timer callback
function startTicker(callback) {
  const tick = () => {
    callback();
    setTimeout(tick, 1000); // recursive timer
  };
  setTimeout(tick, 1000);
}

test('ticks', () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  startTicker(cb);
  jest.runAllTimers(); // throws: Aborting after running 100000 timers, assuming an infinite loop!
});
```

## Correct

```javascript
test('ticks once per second', () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  startTicker(cb);

  jest.runOnlyPendingTimers(); // runs the queued timer; the timer it schedules waits
  expect(cb).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(3000);
  expect(cb).toHaveBeenCalledTimes(4);
});
```

### When the timer is scheduled inside a promise callback

`poll()` schedules its `setTimeout` **inside** a `.then()`, so the timer does not
exist until the promise callback has run. The synchronous timer methods do not
flush promise callbacks, so at the moment they are called there is nothing
queued: `runAllTimers()` returns at once and the callback has run 0 times. Use
the async variants, which run scheduled promise callbacks before advancing the
clock — and note the counts include the call from the initial fetch, not just
the timer-driven ones.

```javascript
function poll(callback) {
  fetchData().then(data => {
    callback(data);
    setTimeout(() => poll(callback), 1000); // recursive timer, queued from a promise callback
  });
}

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
| `runAllTimers()` | Runs all timers including newly created ones | No — throws after 100000 timers |
| `runOnlyPendingTimers()` | Runs only timers in the queue at call time | Yes, but does not flush promise callbacks |
| `advanceTimersByTime(ms)` | Advances clock by `ms`, running timers that fire | Yes, but does not flush promise callbacks |
| `advanceTimersToNextTimer()` | Advances to the next timer and runs it | Yes, but does not flush promise callbacks |
| `runOnlyPendingTimersAsync()` | Asynchronous equivalent of `runOnlyPendingTimers()`; allows scheduled promise callbacks to execute before running the timers | Yes — use when the timer is scheduled inside a promise callback |
| `advanceTimersByTimeAsync(ms)` | Asynchronous equivalent of `advanceTimersByTime(ms)`; allows scheduled promise callbacks to execute | Yes — use when the timer is scheduled inside a promise callback |

## Why

Recursive timers are extremely common: `setInterval`, polling loops, retry-with-backoff, `requestAnimationFrame` polyfills, and debounce/throttle implementations all create new timers from within timer callbacks. Always use `runOnlyPendingTimers` or `advanceTimersByTime` unless you are certain no recursive timers exist.

For code driving the **real** `requestAnimationFrame` (jsdom environment) rather than a `setTimeout`-based polyfill, use `jest.advanceTimersToNextFrame()` instead of guessing a 16ms `advanceTimersByTime` — it advances by exactly the milliseconds needed to run the frame callbacks currently scheduled. The advice above still stands for polyfills, which genuinely are a recursive-timer source.
