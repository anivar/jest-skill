# Changelog

## 1.1.0

Audited against **jest 30.4.2** (latest upstream release at the time of writing; every code
example was executed on jest 30.4.1). Sources are the Jest documentation site only — no release
notes, no CHANGELOG, no library source.

### Baseline

- Declared baseline narrowed from `jest ^29.0.0 / ^30.0.0` to **`jest ^30.0.0`** in `SKILL.md`,
  `README.md` and `AGENTS.md`. The skill documented Jest 30 APIs while claiming Jest 29 support;
  the two spellings of `--testPathPattern(s)` alone are mutually exclusive between the majors.

### Corrected — the skill taught something untrue

- **`.rejects` without `await`** (`rules/matcher-error-wrapping.md`) — the annotation blamed the
  wrong mechanism and implied the fix was an arrow wrapper, which the same file forbids. Passing
  the promise directly is correct; the defect is the missing `await`. Executed: when the
  assertion would have held the test passes, and when it would have failed the error escapes the
  test and takes the whole file down with `Test suite failed to run`.
- **`restoreMocks` scope** (`rules/mock-spy-restore.md`, `rules/mock-clear-vs-reset-vs-restore.md`,
  `AGENTS.md`) — it does **not** restore a method overwritten by hand with `jest.fn()`. Upstream
  limits `restoreAllMocks` to `jest.spyOn` and `jest.replaceProperty`. Executed with
  `restoreMocks: true`: the hand-assigned mock is left completely untouched between tests, fake
  and implementation intact.
- **`mock.instances` vs `mock.contexts`** (`references/mock-functions.md`) — the two were swapped
  and then declared identical. `instances` holds objects built with `new`; `contexts` holds the
  per-call `this`. The wrong `(Jest 29.6+)` tag is gone.
- **"Jest 30 deprecates `done`"** (`SKILL.md`, `AGENTS.md`, `rules/async-done-try-catch.md`) — a
  breaking change that never happened; upstream says "None of these forms is particularly
  superior to the others." Replaced with the one hard rule Jest does enforce: a test function
  cannot both take `done` and return a promise.
- **`doNotFake` list** (`rules/timer-selective-faking.md`) — claimed to be complete while listing
  9 of the 16 `FakeableAPI` values. Added `hrtime`, `nextTick`, `requestAnimationFrame`,
  `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `Temporal`, with the
  environment each applies in. All 16 executed against `useFakeTimers`.
- **`transformIgnorePatterns` default** (`references/configuration.md`,
  `rules/config-transform-node-modules.md`, `AGENTS.md`) — it is a two-element array,
  `['/node_modules/', '\\.pnp\\.[^\\/]+$']`, and overriding replaces rather than merges. Every
  override example now carries the Yarn PnP entry.
- **`coverageProvider` default** (`references/configuration.md`) — `'babel'`, not `'v8'`.
- **`maxWorkers` default** (`references/configuration.md`, `rules/perf-ci-workers.md`) — cores
  **minus one** in single-run mode, half the cores in watch mode. `--maxWorkers=100%` is
  therefore one *more* worker than the default, not "the default behavior".
- **Automock semantics** (`rules/mock-partial-require-actual.md`) — a bare `jest.mock('./api')`
  keeps the API surface and returns `undefined` from each function. Only the *factory* form makes
  omitted exports genuinely missing. Executed both.
- **Factory hoisting example** (`references/module-mocking.md`) — the `FAILS` and `WORKS`
  snippets were byte-identical. Rewritten to contrast a non-`mock`-prefixed name with a prefixed
  one, using "not allowed"/"allowed" rather than a runtime-failure claim: executed on jest 30.4.1
  with `babel-jest`, the unprefixed reference does not actually throw, so the file states the
  documented restriction without asserting an error the runtime does not produce.

### Updated for Jest 30

- `--testPathPattern` → `--testPathPatterns` (`references/ci-and-debugging.md`,
  `references/snapshot-testing.md`), with a note that the singular spelling aborts the run on
  Jest 30 and that `--testNamePattern` was not renamed. Both executed.
- `testRegex` / `testMatch` / `moduleFileExtensions` defaults now recognise `.mjs`/`.cjs`/
  `.mts`/`.cts`. Executed: the pre-30 `testRegex` discovers 1 of 4 test files in a fixture tree,
  the Jest 30 form discovers all 4.
- Snapshot output no longer carries the `Object {` prefix (`snapshotFormat` has defaulted to
  `{escapeString: false, printBasicPrototype: false}` since Jest 29), and snapshot keys serialize
  in sorted order. Corrected in `references/snapshot-testing.md`,
  `rules/snapshot-property-matchers.md` and `references/configuration.md`; the
  `escapeString: true` example, which inverted the default, is gone.

### Added

- Removed alias matchers and the non-enumerable-property change (`references/matchers.md`,
  `references/mock-functions.md`, `AGENTS.md`).
- `expect.arrayOf` / `expect.not.arrayOf`, with the `arrayContaining` contrast spelled out.
- ESM: `import { jest } from '@jest/globals'` in every ESM example, `jest.unstable_unmockModule`,
  and the fact that `jest.mock` does not apply when the resolved file is ESM regardless of
  hoisting. The existing partial-ESM-mock example was replaced: a factory that `import()`s the
  module it mocks re-enters itself and crashes the worker with a heap out-of-memory error on jest
  30.4.1. The example now resolves the real namespace before registering the mock.
- Node built-in modules are not mocked by default — `jest.mock('fs')` is required
  (`references/module-mocking.md`, `rules/module-manual-mock-conventions.md`, `AGENTS.md`).
- `jest.advanceTimersToNextFrame`, `jest.setTimerTickMode`, `useFakeTimers({ advanceTimers })`
  and `useFakeTimers({ legacyFakeTimers })`, plus which APIs are unavailable under legacy fake
  timers (all executed, including the legacy-mode failures).
- `jest.retryTimes` options `waitBeforeRetry` and `retryImmediately`, and the deferred-retry
  default.
- `jest.onGenerateMock` and `jest.isolateModulesAsync`.
- `defineConfig` / `mergeConfig`, the full config filename list, and node
  `testEnvironmentOptions.globalsCleanup`.
- `--ci` snapshot behaviour, `--waitForUnhandledRejections`, and the fact that
  `--detectOpenHandles` implies `--runInBand`.
- `using` with `jest.spyOn` as a third restore option, alongside the existing note that a
  trailing `mockRestore()` is skipped when the assertion throws.

### Method

Every code example added or changed here was written to a file in a jest 30.4.1 sandbox and run
before it went into the skill. Three fix-list recommendations did not survive that step and were
rewritten to match observed behaviour: the `.rejects` failure mode, the fate of a hand-assigned
`jest.fn()` under `restoreMocks`, and the "FAILS" label on the unprefixed factory variable.

## 1.0.0

Initial release: 28 rules, 9 references.
