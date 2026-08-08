# Configuration Reference

Jest discovers configuration automatically from `jest.config.js|ts|mjs|mts|cjs|cts|json`, or from
the `"jest"` key of `package.json`. Plain object exports still work everywhere in this reference;
the `defineConfig` helper adds type-safety and editor autocompletion:

```javascript
const { defineConfig } = require('jest');

module.exports = defineConfig({
  // ... Specify options here.
});
```

TypeScript config files use the same helper with an `import`; upstream loads them through a
`/** @jest-config-loader ts-node */` (or `esbuild-register`) docblock.

Layer a project config over a shared base with `mergeConfig` — relevant to the Projects
(Monorepo) section below:

```javascript
const { defineConfig, mergeConfig } = require('jest');
const jestConfig = require('./jest.config');

module.exports = mergeConfig(
  jestConfig,
  defineConfig({
    // ... Specify options here.
  }),
);
```

## Test File Discovery

### `testMatch`

Glob patterns for test files. Default:
`["**/__tests__/**/*.?([mc])[jt]s?(x)", "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"]` — Jest 30
recognizes `.mjs`/`.cjs`/`.mts`/`.cts` as well as `.js`/`.jsx`/`.ts`/`.tsx`.

```javascript
module.exports = {
  testMatch: [
    '<rootDir>/src/**/*.test.{js,ts,tsx}',
    '<rootDir>/tests/**/*.spec.{js,ts,tsx}',
  ],
};
```

### `testPathIgnorePatterns`

Patterns to exclude from test discovery.

```javascript
module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/fixtures/'],
};
```

### `testRegex`

Alternative to `testMatch` — uses regex instead of globs. Cannot use both. The Jest 30 default
is:

```javascript
module.exports = {
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[mc]?[jt]sx?$',
};
```

The pre-Jest-30 form omitted `[mc]?`; copying it silently stops `.mjs`/`.cjs` test files from
being discovered.

## Transform

### `transform`

Maps file extensions to transformers. Default uses `babel-jest`.

```javascript
module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',                // TypeScript
    '^.+\\.jsx?$': 'babel-jest',             // JavaScript
    '^.+\\.css$': 'jest-css-modules-transform', // CSS
  },
};
```

### `transformIgnorePatterns`

Patterns to skip transformation. Default: `['/node_modules/', '\\.pnp\\.[^\\/]+$']` — the second
entry excludes Yarn PnP files. Setting this option **replaces** the whole array, so carry the
PnP entry over unless you know you do not need it.

```javascript
module.exports = {
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|nanoid|chalk)/)', // transform ESM packages
    '\\.pnp\\.[^\\/]+$',                       // keep the default PnP exclusion
  ],
};
```

## Module Resolution

### `moduleNameMapper`

Maps module paths for aliasing or mocking static assets.

```javascript
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',           // @ alias
    '\\.(css|scss)$': 'identity-obj-proxy',   // CSS modules
    '\\.(jpg|png|svg)$': '<rootDir>/test/__mocks__/fileMock.js', // assets
  },
};
```

### `modulePaths`

Additional directories to search for modules.

```javascript
module.exports = {
  modulePaths: ['<rootDir>/src'],
};
```

### `moduleDirectories`

Directories to search when resolving modules. Default: `['node_modules']`.

```javascript
module.exports = {
  moduleDirectories: ['node_modules', 'src'],
};
```

### `moduleFileExtensions`

Extensions to try, left to right, when a `require` omits one. Default:
`["js", "mjs", "cjs", "jsx", "ts", "mts", "cts", "tsx", "json", "node"]`.

## Test Environment

### `testEnvironment`

The environment for all tests. Default: `'node'`.

```javascript
module.exports = {
  testEnvironment: 'node',   // Node.js globals
  // or
  testEnvironment: 'jsdom',  // Browser-like globals (window, document)
};
```

Per-file override via docblock:

```javascript
/**
 * @jest-environment jsdom
 */
```

### `testEnvironmentOptions`

Options passed to the environment. Default: `{}`. The relevant options depend on which
environment is in use.

```javascript
// jsdom environment
module.exports = {
  testEnvironmentOptions: {
    url: 'https://example.com',  // jsdom URL
    customExportConditions: ['node', 'node-addons'],
  },
};
```

```javascript
// node environment — options are passed to `runInContext`
module.exports = {
  testEnvironmentOptions: {
    globalsCleanup: 'on', // 'on' | 'soft' | 'off'
  },
};
```

Upstream on the node environment: "When using the `node` environment, you can configure various
options that are passed to `runInContext`", including `globalsCleanup` (`'on' | 'soft' | 'off'`)
— "Controls cleanup of global variables between tests. Default: `'soft'`" — plus every option
`vm.runInContext` accepts. This is environment teardown, a different mechanism from the
intra-file order dependence covered by `rules/structure-test-isolation.md`.

## Coverage

### `collectCoverage`

Enable coverage collection. Default: `false`.

```javascript
module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',        // barrel files
    '!src/**/*.stories.tsx',   // Storybook
  ],
};
```

### `coverageThreshold`

Enforce minimum coverage. CI fails if thresholds are not met.

```javascript
module.exports = {
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
    './src/critical/': { branches: 95, lines: 95 },
  },
};
```

### `coverageReporters`

Output formats. Default: `['json', 'text', 'lcov', 'clover']`.

```javascript
module.exports = {
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
};
```

### `coverageDirectory`

Output directory. Default: `'coverage'`.

### `coverageProvider`

Coverage implementation. `'babel'` (default) or `'v8'` (faster, uses V8's built-in coverage, but
different branch-coverage semantics and no `/* istanbul ignore */` support). `'babel'` is still
the Jest 30 default — you must opt into v8 explicitly.

## Mock Configuration

```javascript
module.exports = {
  clearMocks: true,    // jest.clearAllMocks() after each test
  resetMocks: true,    // jest.resetAllMocks() after each test
  restoreMocks: true,  // jest.restoreAllMocks() after each test (recommended)
  automock: false,      // auto-mock all imports (default: false)
};
```

## Setup Files

### `setupFiles`

Run before the test framework is installed. Use for polyfills and global setup.

```javascript
module.exports = {
  setupFiles: ['./jest.polyfills.js'],
};
```

### `setupFilesAfterEnv`

Default: `[]`. A list of paths to modules that run some code to configure or set
up the testing framework before each test file in the suite is executed. Use it
for custom matchers (`jest-extended`, `@testing-library/jest-dom`) and for
`beforeEach` / `afterEach` hooks you want everywhere.

```javascript
module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
};
```

### `globalSetup` / `globalTeardown`

Run once before/after all test suites. Use for starting servers, databases, etc.

```javascript
module.exports = {
  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',
};
```

## Execution

### `maxWorkers`

Maximum number of workers the worker pool will spawn. Default: in single-run mode, the number of
available cores **minus one** (reserved for the main thread); in watch mode, half of the
available cores.

```javascript
module.exports = {
  maxWorkers: '50%',  // or a fixed number: 2
};
```

### `verbose`

Display individual test results. Default: `false`.

### `bail`

Stop after `n` test failures. `true` = 1.

```javascript
module.exports = {
  bail: 1, // stop on first failure
};
```

### `testTimeout`

Default timeout for tests in ms. Default: `5000`.

```javascript
module.exports = {
  testTimeout: 10000,
};
```

### `randomize`

Run tests in random order within each file.

```javascript
module.exports = {
  randomize: true,
};
```

## Projects (Monorepo)

```javascript
module.exports = {
  projects: [
    '<rootDir>/packages/core',
    '<rootDir>/packages/web',
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/**/*.integration.ts'],
      testTimeout: 30000,
    },
  ],
};
```

## Snapshot

`snapshotFormat` defaults to `{escapeString: false, printBasicPrototype: false}`, so stored
snapshots already print `{` rather than `Object {`. Set the key only to override something.

```javascript
module.exports = {
  snapshotSerializers: ['enzyme-to-json/serializer'],
};
```

## Watch Plugins

```javascript
module.exports = {
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
```
