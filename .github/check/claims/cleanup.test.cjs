// The cleanup table in rules/mock-clear-vs-reset-vs-restore.md (corrected in 1.2.1).
const target = { greet: () => "real" };

test("clearAllMocks clears calls, keeps implementations, and leaves spies mocked", () => {
  const fn = jest.fn(() => "impl");
  const spy = jest.spyOn(target, "greet").mockReturnValue("mocked");
  fn();
  target.greet();
  jest.clearAllMocks();
  expect(fn).toHaveBeenCalledTimes(0);
  expect(fn()).toBe("impl");
  expect(target.greet()).toBe("mocked");
  spy.mockRestore();
});

test("resetAllMocks clears calls and empties implementations, and does not restore spies", () => {
  const fn = jest.fn(() => "impl");
  const spy = jest.spyOn(target, "greet").mockReturnValue("mocked");
  fn();
  target.greet();
  jest.resetAllMocks();
  expect(fn).toHaveBeenCalledTimes(0);
  expect(fn()).toBeUndefined();
  expect(jest.isMockFunction(target.greet)).toBe(true);
  expect(target.greet()).toBeUndefined();
  spy.mockRestore();
});

test("restoreAllMocks restores spies and keeps calls and jest.fn implementations", () => {
  const fn = jest.fn(() => "impl");
  const spy = jest.spyOn(target, "greet").mockReturnValue("mocked");
  fn();
  target.greet();
  jest.restoreAllMocks();
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn()).toBe("impl");
  expect(target.greet()).toBe("real");
  expect(spy).toHaveBeenCalledTimes(1);
});

test("mockRestore on one spy clears its calls, empties it, and restores the original", () => {
  const spy = jest.spyOn(target, "greet").mockReturnValue("mocked");
  target.greet();
  spy.mockRestore();
  expect(spy).toHaveBeenCalledTimes(0);
  expect(target.greet()).toBe("real");
});
