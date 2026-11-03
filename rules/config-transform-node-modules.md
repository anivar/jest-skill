---
title: Configure transformIgnorePatterns for ESM packages
impact: MEDIUM
description: Jest does not transform node_modules by default. ESM-only packages fail with SyntaxError unless you configure transformIgnorePatterns to include them.
tags: config, transform, transformIgnorePatterns, esm, node_modules, SyntaxError
---

# Configure transformIgnorePatterns for ESM packages

## Problem

Jest's default `transformIgnorePatterns` skips `node_modules/`, meaning third-party packages are not transpiled. When a dependency ships ESM-only code (using `import`/`export` syntax) and a CJS test `require()`s it, Jest 30.5.2 fails the suite with `Must use import to load ES Module: …/node_modules/uuid/dist-node/index.js`.

## Incorrect

```javascript
// jest.config.js — default config
module.exports = {
  // transformIgnorePatterns defaults to ['/node_modules/', '\\.pnp\\.[^\\/]+$']
  // ESM-only packages like `uuid` v12+, `nanoid` v4+, `chalk` v5+ fail:
  // Must use import to load ES Module: .../node_modules/uuid/dist-node/index.js
};
```

## Correct

```javascript
// jest.config.js — allow specific ESM packages to be transformed
module.exports = {
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|nanoid|chalk|@esm-package)/)',
    '\\.pnp\\.[^\\/]+$', // preserved from the default — excludes Yarn PnP files
  ],
};
```

```javascript
// babel.config.js — project-wide, so it applies inside node_modules
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
```

The pattern only lets the file through to the transformer; the transformer must also compile
`import`/`export` to CommonJS. The default `babel-jest` with no project Babel config does not, so
the test still fails with the same error. A `.babelrc` does not apply to files in `node_modules`
either; use a project-wide `babel.config.js`. Measured with uuid 14.0.3 on Node.js 22.23.3 and
26.12.1: only the pattern plus `babel.config.js` passes.

```bash
# Node.js 24.9+: Jest can require() the ES module itself, with no transform
NODE_OPTIONS=--experimental-vm-modules npx jest
```

Without `--experimental-vm-modules`, Node.js 24 and 26 fail with the same error. A package whose
module graph uses top-level `await` cannot be `require()`d this way.

```javascript
// Using a regex pattern for multiple packages
module.exports = {
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!(' +
      'uuid|' +
      'nanoid|' +
      'chalk|' +
      '@scope/esm-pkg' +
    ')/)',
  ],
};
```

## How It Works

The `transformIgnorePatterns` array contains regex patterns. Files matching these patterns are **not** transformed. The default is `['/node_modules/', '\\.pnp\\.[^\\/]+$']` — it skips all of `node_modules/` **plus** Yarn PnP files. Setting the option replaces the whole array rather than merging, so an override that lists only the `node_modules` pattern silently drops the PnP exclusion.

To transform specific packages, use a **negative lookahead**:

```
/node_modules/(?!(package-a|package-b)/)
```

This means: "ignore node_modules, **except** `package-a` and `package-b`."

## Common ESM-Only Packages

| Package | ESM since |
|---|---|
| `chalk` | v5 |
| `nanoid` | v4 |
| `uuid` | v12 (v9–v11 also ship CommonJS) |
| `execa` | v6 |
| `got` | v12 |
| `p-*` (p-limit, p-queue, etc.) | Various |

## Why

- Many popular packages now ship ESM-only, dropping CJS support.
- Jest uses CJS by default for its module system, so ESM code must be transpiled, or loaded with `--experimental-vm-modules` on Node.js 24.9+.
- Adding packages to the negative lookahead allows Jest's transformer (Babel, SWC, or ts-jest) to compile them, if that transformer is configured to compile ESM to CommonJS.
- Alternative: Use `moduleNameMapper` to point at a CJS build if the package provides one.

```javascript
// Alternative: map to a CJS build — only for a package that still ships one
module.exports = {
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'), // uuid 9–11: the CJS build; uuid 12+: an ES module, so this does not help
  },
};
```
