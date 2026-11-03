// resetMocks: true (1.2.1): the factory implementation is emptied before each test.
jest.mock("./dep", () => ({ greet: jest.fn(() => "factory") }));
const dep = require("./dep");

test("the factory jest.fn returns undefined", () => {
  expect(dep.greet()).toBeUndefined();
});
