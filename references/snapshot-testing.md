# Snapshot Testing Reference

## Basic Usage

### `toMatchSnapshot(propertyMatchers?, hint?)`

Compares the serialized value against a stored snapshot file (`.snap`). On first run, creates the snapshot. On subsequent runs, compares against it.

```javascript
test('renders correctly', () => {
  const tree = renderer.create(<Button label="Click" />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

### `toMatchInlineSnapshot(propertyMatchers?, snapshot?)`

Same as `toMatchSnapshot` but stores the snapshot inline in the test file. Jest auto-updates the inline snapshot string.

```javascript
test('formats greeting', () => {
  expect(formatGreeting('Alice')).toMatchInlineSnapshot(`"Hello, Alice!"`);
});
```

On first run, the snapshot string is auto-inserted:

```javascript
// Before first run:
expect(formatGreeting('Alice')).toMatchInlineSnapshot();

// After first run (auto-filled):
expect(formatGreeting('Alice')).toMatchInlineSnapshot(`"Hello, Alice!"`);
```

## Property Matchers

For objects with dynamic fields (timestamps, IDs), property matchers assert the type while letting the snapshot pin the static fields.

```javascript
test('creates user', () => {
  expect(createUser({ name: 'Alice' })).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  });
});
// Stored snapshot (keys are serialized in sorted order):
// {
//   "createdAt": Any<Date>,
//   "id": Any<String>,
//   "name": "Alice",
// }
```

Works with inline snapshots too:

```javascript
expect(createUser({ name: 'Alice' })).toMatchInlineSnapshot(
  { id: expect.any(String), createdAt: expect.any(Date) },
  `
  {
    "createdAt": Any<Date>,
    "id": Any<String>,
    "name": "Alice",
  }
  `
);
```

## Updating Snapshots

```bash
# Update all snapshots
npx jest --updateSnapshot
npx jest -u

# Update snapshots for specific test files
npx jest -u --testPathPatterns='Button'

# Or narrow by test name — the upstream-recommended way to limit what regenerates
npx jest -u --testNamePattern='renders disabled'

# In watch mode: press 'u' to update failed snapshots
```

## Snapshot Files

- Stored in `__snapshots__/` directory adjacent to the test file.
- File extension: `.snap`.
- Should be committed to version control.
- Review snapshot diffs carefully in PRs — they represent behavioral changes.

### New snapshots in CI

Run Jest with `--ci` in CI. Without it, a test whose stored snapshot is missing writes the new
snapshot and passes — so a forgotten `.snap` commit produces a green build that asserts nothing.
With `--ci`, "Instead of the regular behavior of storing a new snapshot automatically, it will
fail the test and require Jest to be run with `--updateSnapshot`." Upstream: "as of Jest 20,
snapshots in Jest are not automatically written when Jest is run in a CI system without
explicitly passing `--updateSnapshot`."

```bash
npx jest --ci
```

## Custom Serializers

Serializers control how objects are rendered in snapshots.

```javascript
// jest.config.js
module.exports = {
  snapshotSerializers: ['enzyme-to-json/serializer'],
};
```

### Writing a custom serializer

```javascript
// my-serializer.js
module.exports = {
  test(val) {
    return val && val.hasOwnProperty('myCustomProp');
  },
  serialize(val, config, indentation, depth, refs, printer) {
    return `MyCustom<${val.myCustomProp}>`;
  },
};
```

```javascript
// Add inline
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && val.startsWith('$$'),
  serialize: (val) => `Token(${val.slice(2)})`,
});
```

## Snapshot Format

`snapshotFormat` defaults to `{escapeString: false, printBasicPrototype: false}`, so snapshots
already print `{` rather than `Object {` without any configuration. Set a key only when you
deliberately want to override the default — note that `escapeString: true` inverts it, changing
how existing snapshots serialize.

```javascript
// jest.config.js — deliberate override, not a recommended default
module.exports = {
  snapshotFormat: {
    printBasicPrototype: true, // opt back in to the old "Object {" prefix
  },
};
```

## Best Practices

### Keep snapshots small

Snapshot large component trees into individual pieces:

```javascript
// Bad: entire page
expect(renderer.create(<Page />).toJSON()).toMatchSnapshot();

// Good: individual components
expect(renderer.create(<Header />).toJSON()).toMatchSnapshot();
expect(renderer.create(<Sidebar />).toJSON()).toMatchSnapshot();
```

### Prefer inline snapshots for small values

```javascript
expect(formatCurrency(1234.5)).toMatchInlineSnapshot(`"$1,234.50"`);
```

### Use descriptive hint parameters

```javascript
expect(tree).toMatchSnapshot('initial render');
expect(tree).toMatchSnapshot('after clicking button');
```

### Mock non-deterministic values

```javascript
jest.useFakeTimers({ now: new Date('2024-01-01') });
jest.spyOn(Math, 'random').mockReturnValue(0.5);
```

## toThrowErrorMatchingSnapshot

```javascript
test('throws formatted error', () => {
  expect(() => validate(null)).toThrowErrorMatchingSnapshot();
});

test('throws formatted error inline', () => {
  expect(() => validate(null)).toThrowErrorMatchingInlineSnapshot(
    `"Validation failed: value must not be null"`
  );
});
```

## Asymmetric Matchers in Snapshots

You can use asymmetric matchers as property matchers:

```javascript
expect(response).toMatchSnapshot({
  body: {
    users: expect.arrayContaining([
      expect.objectContaining({ role: 'admin' }),
    ]),
    total: expect.any(Number),
    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
  },
});
```

For plain `toEqual` assertions on homogeneous arrays there is also `expect.arrayOf` (every
element matches one matcher) — see `references/matchers.md`. Upstream documents it with
`toEqual`, not as a snapshot property matcher.
