// The Jest globals a TypeScript test file sees when it does not import them, typed from @jest/globals 30.5.2.
/// <reference types="@testing-library/jest-dom/jest-globals" />
import type * as G from "@jest/globals";
type FunctionLike = (...args: any) => any;
type ClassLike = abstract new (...args: any) => any;
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
  const jest: typeof G.jest;
  const beforeAll: typeof G.beforeAll;
  const beforeEach: typeof G.beforeEach;
  const afterAll: typeof G.afterAll;
  const afterEach: typeof G.afterEach;
  namespace jest {
    type Mock<T extends FunctionLike = (...args: unknown[]) => unknown> = G.jest.Mock<T>;
    type Mocked<T extends object> = G.jest.Mocked<T>;
    type MockedClass<T extends ClassLike> = G.jest.MockedClass<T>;
    type MockedFunction<T extends FunctionLike> = G.jest.MockedFunction<T>;
    type MockedObject<T extends object> = G.jest.MockedObject<T>;
    type Replaced<T> = G.jest.Replaced<T>;
    type Spied<T extends ClassLike | FunctionLike> = G.jest.Spied<T>;
    type SpiedFunction<T extends FunctionLike> = G.jest.SpiedFunction<T>;
  }
}
export {};
