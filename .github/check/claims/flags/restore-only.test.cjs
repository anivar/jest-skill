// restoreMocks: true alone (1.2.1): a factory jest.fn keeps its calls from one test to the next.
jest.mock("./dep", () => ({ greet: jest.fn(() => "factory") }));
const dep = require("./dep");

test("first test calls the mock", () => {
  dep.greet();
});
test("second test still sees that call", () => {
  expect(dep.greet).toHaveBeenCalledTimes(1);
});
