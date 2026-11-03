// references/mock-functions.md and the JavaScript prelude of blocks.ts.

test("whenCalledWith takes literals and asymmetric matchers; other calls fall through", () => {
  const color = jest.fn();
  color.whenCalledWith("apple").mockReturnValue("red");
  color.whenCalledWith(expect.any(Number)).mockReturnValue("number");
  expect(color("apple")).toBe("red");
  expect(color(7)).toBe("number");
  expect(color("grape")).toBeUndefined();
});

// prelude.js.d.ts lets a JavaScript hook return a value because Jest runs such a hook.
describe("a hook that returns the jest object", () => {
  const target = { now: () => "real" };
  afterEach(() => jest.restoreAllMocks());
  test("spies on a method", () => {
    jest.spyOn(target, "now").mockReturnValue("mocked");
    expect(target.now()).toBe("mocked");
  });
  test("runs, and restores the spy", () => {
    expect(target.now()).toBe("real");
  });
});
