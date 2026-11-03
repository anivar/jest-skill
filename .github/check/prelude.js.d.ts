// The Jest globals a JavaScript test file sees, typed from @jest/globals 30.5.2. JavaScript has no type
// arguments, so jest.fn() without one takes and returns `any`, and the module loaders return the module as
// `any`. With the @jest/globals defaults, a JavaScript call such as `jest.fn().mockResolvedValue(1)` would not
// type-check, although it is correct.
/// <reference types="@testing-library/jest-dom/jest-globals" />
import type * as G from "@jest/globals";
type AnyFunction = (...args: any[]) => any;
// A hook may return any value: jest-circus only checks a test's return value, not a hook's. @jest/globals allows
// only void or a promise there, so `afterEach(() => jest.restoreAllMocks())`, which returns the jest object,
// would not type-check, although Jest runs it.
type Hook = (fn: (...args: any[]) => unknown, timeout?: number) => void;
type JavaScriptJest = Omit<typeof G.jest, "fn" | "requireActual" | "requireMock" | "createMockFromModule"> & {
  fn<T extends AnyFunction = AnyFunction>(implementation?: T): G.jest.Mock<T>;
  requireActual(moduleName: string): any;
  requireMock(moduleName: string): any;
  createMockFromModule(moduleName: string): any;
};
declare global {
  const describe: typeof G.describe;
  const fdescribe: typeof G.fdescribe;
  const xdescribe: typeof G.xdescribe;
  const it: typeof G.it;
  const fit: typeof G.fit;
  const xit: typeof G.xit;
  const test: typeof G.test;
  const xtest: typeof G.xtest;
  const expect: typeof G.expect;
  const jest: JavaScriptJest;
  const beforeAll: Hook;
  const beforeEach: Hook;
  const afterAll: Hook;
  const afterEach: Hook;
}
export {};
