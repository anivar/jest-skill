---
title: Use doNotFake to leave specific APIs real
impact: MEDIUM
description: jest.useFakeTimers fakes all timer APIs by default. Use the doNotFake option to keep specific APIs (like Date, performance, queueMicrotask) real.
tags: timer, useFakeTimers, doNotFake, Date, performance, selective
---

# Use doNotFake to leave specific APIs real

## Problem

`jest.useFakeTimers()` replaces all timer-related globals by default (`doNotFake` defaults to `[]`), including `setTimeout`, `setInterval`, `setImmediate`, `clearTimeout`, `clearInterval`, `clearImmediate`, `Date`, `performance`, and `queueMicrotask` — see the full list below. This can break libraries that rely on real `Date.now()` or `performance.now()` for non-timer purposes (e.g., logging, timing real I/O, cache TTL calculations).

## Incorrect

```javascript
// BUG: performance is faked — the clock does not move while real I/O runs
const { readFile } = require('node:fs/promises');

async function timedRead(file) {
  const start = performance.now();
  const text = await readFile(file, 'utf8');
  return { text, ms: performance.now() - start };
}

test('reports how long the read took', async () => {
  jest.useFakeTimers();
  const { ms } = await timedRead(__filename);
  expect(ms).toBeGreaterThan(0); // FAILS — ms is 0
});
```

## Correct

```javascript
test('reports how long the read took', async () => {
  jest.useFakeTimers({ doNotFake: ['performance'] });
  const { ms } = await timedRead(__filename);
  expect(ms).toBeGreaterThan(0); // PASSES — performance.now() is real
});
```

```javascript
// Keep multiple APIs real
test('measures performance', () => {
  jest.useFakeTimers({
    doNotFake: ['Date', 'performance', 'queueMicrotask'],
  });
  // setTimeout and setInterval are fake
  // Date, performance.now(), and queueMicrotask are real
});
```

## Fakeable APIs

Every value `doNotFake` accepts — this is the whole `FakeableAPI` union:

| API | Default faked | Common reason to keep real |
|---|---|---|
| `setTimeout` | Yes | Rarely |
| `setInterval` | Yes | Rarely |
| `setImmediate` | Yes | Rarely |
| `clearTimeout` | Yes | Rarely |
| `clearInterval` | Yes | Rarely |
| `clearImmediate` | Yes | Rarely |
| `Date` | Yes | Logging, timing real I/O, cache TTL |
| `performance` | Yes | Benchmarking, metrics libraries |
| `queueMicrotask` | Yes | Promise-based code, React rendering |
| `hrtime` | Yes — node env (`process.hrtime`) | Benchmarking |
| `nextTick` | Yes — node env (`process.nextTick`) | Libraries driven by the process tick |
| `requestAnimationFrame` | Yes — jsdom env | rAF harnesses that drive their own clock |
| `cancelAnimationFrame` | Yes — jsdom env | Same as above |
| `requestIdleCallback` | Yes — jsdom env | Idle-scheduling libraries |
| `cancelIdleCallback` | Yes — jsdom env | Same as above |
| `Temporal` | Yes | Code reading a real `Temporal` clock |

Upstream on what is swapped where: fake timers replace `Date`, `performance.now()`,
`queueMicrotask()`, `setImmediate()`, `clearImmediate()`, `setInterval()`, `clearInterval()`,
`setTimeout()`, `clearTimeout()`; "In Node environment `process.hrtime`, `process.nextTick()`
and in JSDOM environment `requestAnimationFrame()`, `cancelAnimationFrame()`,
`requestIdleCallback()`, `cancelIdleCallback()` will be replaced as well."

```javascript
// Common real uses of the option beyond Date/performance
jest.useFakeTimers({ doNotFake: ['nextTick'] });
jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
```

## Why

Faking everything by default is Jest's safest option for deterministic tests, but it can cause surprising failures in code that reads the clock for non-scheduling purposes. The `doNotFake` option gives you surgical control.

You can also set a fixed fake time for `Date`:

```javascript
jest.useFakeTimers({ now: new Date('2024-01-01T00:00:00Z') });
expect(Date.now()).toBe(1704067200000); // frozen at Jan 1, 2024
```

Since Jest 30.4, `useFakeTimers({ now })` and `jest.setSystemTime()` also accept a `Temporal.Instant` or `Temporal.ZonedDateTime`, and `jest.advanceTimersByTime()` accepts a `Temporal.Duration`.
