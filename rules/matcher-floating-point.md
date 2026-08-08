---
title: Use toBeCloseTo for floats, never toBe
impact: HIGH
description: Floating-point arithmetic produces rounding errors. toBe fails on values like 0.1 + 0.2; use toBeCloseTo instead.
tags: matcher, toBeCloseTo, floating-point, precision, toBe
---

# Use toBeCloseTo for floats, never toBe

## Problem

IEEE 754 floating-point arithmetic means `0.1 + 0.2 === 0.30000000000000004`, not `0.3`. Using `toBe` or `toEqual` for float comparisons causes tests to fail unpredictably on values that are mathematically equal but differ by a tiny rounding error.

## Incorrect

```javascript
// BUG: 0.1 + 0.2 = 0.30000000000000004, not 0.3
test('calculates total', () => {
  expect(0.1 + 0.2).toBe(0.3); // FAILS
});

test('calculates tax', () => {
  expect(calculateTax(100, 0.07)).toEqual(7.0); // May fail on edge cases
});
```

## Correct

```javascript
test('calculates total', () => {
  expect(0.1 + 0.2).toBeCloseTo(0.3); // PASSES — default numDigits is 2 (criterion < 0.005)
});

test('calculates tax', () => {
  expect(calculateTax(100, 0.07)).toBeCloseTo(7.0, 2); // 2 decimal places
});
```

## Why

`toBeCloseTo(expected, numDigits)` checks that `Math.abs(expected - received) < 10 ** -numDigits / 2`. The default `numDigits` is `2`, so the criterion is `< 0.005` — differences smaller than that are considered equal. That is far looser than it looks: pass `numDigits` explicitly whenever you actually need precision.

| numDigits | Tolerance | Use case |
|---|---|---|
| 0 | 0.5 | Rough estimates |
| 2 | 0.005 | Currency (2 decimal places) — **default** |
| 5 | 0.000005 | Tighter floating-point comparison |
| 10 | 5e-11 | Scientific computation |

`expect.closeTo(number, numDigits?)`, for use inside `objectContaining` / `arrayContaining`, takes the same default.

**When to use `toBe` with numbers**: Only for integers or values you know are exact (e.g., array `.length`, counter increments, enum values).
