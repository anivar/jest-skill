// clearMocks: true with restoreMocks: true (1.2.1): calls are cleared, the factory implementation stays,
// and a spy is restored before the next test.
jest.mock("./dep", () => ({ greet: jest.fn(() => "factory") }));
const dep = require("./dep");
const target = { now: () => "real" };

test("first test calls the mock and spies", () => {
  dep.greet();
  jest.spyOn(target, "now").mockReturnValue("mocked");
  expect(target.now()).toBe("mocked");
});
test("second test starts with no calls, the factory implementation, and the real method", () => {
  expect(dep.greet).toHaveBeenCalledTimes(0);
  expect(dep.greet()).toBe("factory");
  expect(target.now()).toBe("real");
});
