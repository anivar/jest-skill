# Changelog

## 1.2.3

Checked against **jest 30.5.2** with React 19.3.1 and `@testing-library/react` 16.3.3. Every changed example was executed or type-checked with TypeScript 5.9.

### Corrected — the skill taught something untrue

- **Snapshot examples used `react-test-renderer`, which React 19 deprecates.** Executed on React 19.3.1: each `renderer.create()` call logs "react-test-renderer is deprecated. See https://react.dev/warnings/react-test-renderer". The Jest snapshot docs render with `@testing-library/react` and snapshot `container.firstChild`. The examples in `references/snapshot-testing.md`, `references/anti-patterns.md`, `rules/snapshot-keep-small.md` and `AGENTS.md` now do the same; executed, the new form writes the expected snapshot.
- **`jest.mocked(require('./api'))` was said to be typed.** In TypeScript `require()` returns `any`, so the result is `any`: type-checked, a wrong assignment and a call with wrong arguments both compile. `jest.mocked()` on an imported module gives `jest.MockedFunction<typeof fetchUser>` members and rejects a wrong resolved value. `references/jest-object.md`, `references/mock-functions.md` and `references/module-mocking.md` now pass the import.

### Changed

- The Incorrect example in `rules/structure-sync-definition.md` iterated the `Response` from `fetch()` as if it were the array of cases. It now calls `.json()` first, so the only bug it shows is the asynchronous test definition.
- The test-isolation example in `AGENTS.md` declared `items` twice in one block. Incorrect and Correct are now separate blocks, so each one runs as written.

## 1.2.2

### Fixed

- **The agent-reporter guidance had no rule file.** 1.2.1 added it to `AGENTS.md` as a rule, but `rules/` and the `SKILL.md` quick reference did not list it. It is now `rules/perf-agent-reporter.md`, listed in `SKILL.md` and counted in `README.md` (29 rules). The rule gives the full list of agent environment variables that Jest 30.5.2 checks, and says that `--verbose` does not restore the passing-file lines.

## 1.2.1

Checked against **jest 30.5.2**. Every changed example was executed with the default `babel-jest` on Node.js 26.12.1, and on Node.js 22.23.3 and 24.22.1 where a claim depends on the Node version. Every changed block was type-checked with TypeScript 5.9.

### Corrected — the skill taught something untrue

- **The hoisting rule's Incorrect example ran.** `rules/mock-factory-hoisting.md` used `const fakeUser = { id: 1, name: 'Alice' }`. `babel-plugin-jest-hoist` accepts a `const` with a pure initializer and moves it up with the mock. The example now sets `fakeUser` with a function call, which the transform rejects ("The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables"). The rule states the pure-constant exception (also in `AGENTS.md`).
- **`mocked` does not break the `mock` prefix exception.** The plugin tests `/^mock/i`, so `mocked` and `MockUser` pass. Executed: a factory that reads `mockedUser` runs; one that reads `my_mock` is rejected.
- **The ESM Incorrect example failed for a different reason than stated.** Without an import of `jest`, the file fails with `ReferenceError: jest is not defined`. The example now imports `jest` from `@jest/globals`, and then fails as the comment says: `TypeError: fetchUser.mockReturnValue is not a function`.
- **`runAllTimers()` on a recursive timer does not hang.** It throws `Aborting after running 100000 timers, assuming an infinite loop!` (`rules/timer-recursive-safety.md`, `references/anti-patterns.md`, `AGENTS.md`). The rule's Incorrect example queued its timer inside `.then()`, where `runAllTimers()` finds no timer and returns at once. It now uses a timer that schedules itself, and the promise case has its own section. Executed: the counts in both Correct sections (1 then 4; 2 then 3; 4).
- **A faked `Date` does not make uuid repeat IDs.** uuid 14.0.3 `v1`, `v4` and `v7` return distinct IDs under `jest.useFakeTimers()`. `rules/timer-selective-faking.md` now shows timing real I/O with `performance.now()`, which reads 0 ms when `performance` is faked. Executed both ways. A `Date.now()`-based ID was not used: it repeats with the real clock too (998 of 1000 back-to-back pairs).
- **`restoreAllMocks` does not clear calls or remove implementations.** It restores spies and replaced properties only. A restored spy keeps its calls, and a plain `jest.fn` keeps its calls and implementation. The cleanup tables in `rules/mock-clear-vs-reset-vs-restore.md`, `references/mock-functions.md` and `AGENTS.md` now follow a measured matrix of each cleanup against `jest.fn(impl)`, `mockReturnValue` and `spyOn`.
- **`restoreMocks: true` alone lets call history carry between tests.** Executed: a factory `jest.fn` called in one test shows 1 call in the next. Every place that recommends the config now recommends `clearMocks: true` with `restoreMocks: true`. The config comments said "after each test"; the flags run before each test.
- **A `done` test with a failing `expect` still reports the assertion.** Jest 30 prints the assertion error after the 5 s timeout, then "Exceeded timeout of 5000 ms for a test while waiting for `done()` to be called." The quoted "Timeout - Async callback was not invoked" is not Jest 30's text (`rules/async-done-try-catch.md`, `AGENTS.md`).
- **Tests defined late do not pass silently.** With no synchronous test the file fails with "Your test suite must contain at least one test."; with one, "Cannot add a test after tests have started running. Tests must be defined synchronously." (`rules/structure-sync-definition.md`, `AGENTS.md`).
- **A missing `await` is not always a silent pass.** When the promise is already resolved, a failing assertion is an uncaught error that takes down the run (`rules/async-always-await.md`, `AGENTS.md`).
- **`using spy = jest.spyOn(...)` does not need a transform on a current runtime.** With the default `babel-jest` it runs on Node.js 24.22.1 and 26.12.1, and fails on 22.23.3 with `SyntaxError: Unexpected identifier 'spy'` (`rules/mock-spy-restore.md`, `AGENTS.md`).
- **`@jest/globals` has no `Mocked` export** (TS2305). The type is `jest.Mocked` (`references/mock-functions.md`).
- **One config object had two `testEnvironment` keys** (TS1117), so a copy kept only the last (`references/configuration.md`).
- **The compatibility field said `jest ^30.0.0`** while the description, README and AGENTS.md said `^30.5.2`. It now says `^30.5.2`.
- **The ESM-package rule did not work as written.** `rules/config-transform-node-modules.md` said uuid is ESM-only since v9 (v9–v11 ship CommonJS; v12 is the first ESM-only release), quoted an error Jest 30.5.2 does not print (it says `Must use import to load ES Module`), and implied that the `transformIgnorePatterns` pattern is enough. Executed with uuid 14.0.3 on Node.js 22.23.3 and 26.12.1: the pattern passes only with a project-wide `babel.config.js` that compiles ESM; with no Babel config or with a `.babelrc` it fails. The `moduleNameMapper` fallback resolves to an ES module for uuid 12+. The rule now says so, and adds the Node.js 24.9+ route: `--experimental-vm-modules` lets Jest `require()` the package with no transform (also in `AGENTS.md` and `references/configuration.md`).
- **Companion skills that do not exist.** `react-native-testing` and `java-testing` are removed from `SKILL.md` and `README.md`. The msw companion is described as MSW 3, its current baseline.

### Added

- **ESM automocking on Node.js 24.9+** (`rules/module-esm-unstable-mock.md`, `AGENTS.md`). With `automock: true`, static `import` and `import()` of an ES module get an automock, and a sibling `__mocks__` file replaces it. Executed on Node.js 24.22.1 and 26.12.1; on 22.23.3 it fails with `Attempting to import a mock without a factory`. Without `automock`, `jest.mock()` still does not mock an ES module, even with a `__mocks__` file.
- **Jest's agent reporter** (`references/ci-and-debugging.md`, `AGENTS.md`). Since Jest 30.3, an agent environment variable such as `CLAUDECODE` or `AI_AGENT` makes Jest print only failing files and the summary, unless `reporters` is set. Executed: passing files and their `console.log` output disappear; `--reporters=default` or a `reporters` entry in the config brings them back.
- **`workerGracefulExitTimeout`** and **per-project `verbose` and `silent`** in `references/configuration.md`. Executed: the option is accepted, and `silent: true` on one project hides only that project's console output.

### Changed

- The "Jest 30.4–30.5 Additions" section in `SKILL.md` is removed. Each item now lives in the reference for its topic: `whenCalledWith` in `references/mock-functions.md`, `entireDescribe` retries in `references/jest-object.md`, `--collectTests` and the richer retry output in `references/ci-and-debugging.md`, Temporal in `rules/timer-selective-faking.md`, Node type stripping in `references/configuration.md`, and the wider `toMatchObject` type in `references/matchers.md`. `defineConfig`, `mergeConfig` and `jest.config.mts` were already in `references/configuration.md`. Executed: `whenCalledWith` with literals and an asymmetric matcher, an `entireDescribe` retry, and `--collectTests` with `test.each` and `test.todo`.
- Examples that did not parse or type-check now do: a config fragment, a block that declared `items` twice, hooks that returned the `jest` object, and a helper named `process`.
- This file lists releases newest first.

## 1.2.0

Baseline raised from `^30.0.0` to `^30.5.2` in `SKILL.md`, `AGENTS.md` and `README.md` (audited against jest 30.5.2); `metadata.version` is now 1.2.0.

### Added

A "Jest 30.4–30.5 Additions" section in `SKILL.md`: `mockFn.whenCalledWith()` for per-argument-list mock configuration with asymmetric-matcher support; describe-level retries via `jest.retryTimes(n, { entireDescribe: true })`; expanded `--collectTests` with per-status counts; nested `cause`/`AggregateError` code frames in retry and unhandled-rejection output; `defineConfig`/`mergeConfig`; `jest.config.mts`; Temporal duration/instant support in fake timers; Node-native TypeScript stripping for untransformed `.ts`/`.mts`/`.cts` files; and the widened `object` parameter type in `toMatchObject`/`objectContaining`.

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
