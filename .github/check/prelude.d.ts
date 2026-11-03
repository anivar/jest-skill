// Application code the examples call without declaring it. Each name has a real type that fits every place
// the examples use it; none is `any`. A block that declares the name itself shadows the declaration here.
import type { Mock } from "jest-mock";
import type { RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email?: string;
  createdAt?: Date;
}

declare global {
  // Data
  const value: number;
  const str: string;
  const arr: unknown[];
  const obj: { key: string; nested: { key: string }; subset: string; value: number };
  const sameObjRef: typeof obj;
  const users: User[];
  const date: Date;
  const data: unknown;
  const result: Record<string, unknown>;
  const response: Record<string, unknown>;
  const promise: Promise<unknown>;
  const arg1: string;
  const arg2: number;
  const thisArg: unknown;
  const fn: Mock<(...args: unknown[]) => unknown>;
  const tree: ReturnType<import("react-test-renderer").ReactTestRenderer["toJSON"]>;

  // Functions under test
  function add(a: number, b: number): number;
  function calculateTax(amount: number, rate: number): number;
  function validateAge(age: unknown): boolean;
  function validate(input: unknown): boolean;
  function transform(input: unknown): unknown;
  function run(input: unknown): unknown;
  function formatGreeting(name: string): string;
  function formatCurrency(amount: number): string;
  function formatOutput(data: unknown): string;
  function getUser(): User;
  function getCount(): number;
  function getName(): string;
  function getFlag(): boolean;
  function readConfig(): string;
  function createUser(input: { name: string }): User & { createdAt: Date };
  function createRecord(input: { name: string }): { id: string; name: string; createdAt: Date };
  function createAuditLog(action: string, details: Record<string, unknown>): {
    id: string;
    action: string;
    details: Record<string, unknown>;
    timestamp: Date;
  };
  function throwingFn(): void;
  function doSomething(): void;
  function doSomethingThatLogs(): void;
  function triggerRealError(): void;
  function myFunction(): void;
  function setupStepThatWillLogAWarning(): void;
  function startTicker(callback?: () => void): void;
  function startAsyncPoller(): void;
  function loadFixtures(): Array<{ name: string; input: unknown; expected: unknown }>;

  // Async functions under test
  /** Rejects for an invalid id, such as null or a negative number. */
  function fetchUser(id: number | null): Promise<User>;
  /** The Node.js callback form the `done` examples use. */
  function fetchUser(id: number, callback: (error: Error | null, user: User) => void): void;
  function fetchData(): Promise<{ id: number; items: string[] }>;
  function asyncFn(): Promise<string>;
  function processData(input: unknown): Promise<unknown>;
  function riskyOp(): Promise<void>;
  function riskyOperation(): Promise<void>;
  function longRunningTask(): Promise<void>;
  function badCall(): Promise<never>;
  function getItems(): Promise<Array<{ id: number; valid: boolean }>>;
  function getUsers(): Promise<User[]>;
  function loadCases(): Promise<Array<{ name: string; input: string; output: string }>>;
  function asyncOp(callback: (error: Error | null, data?: unknown) => void): void;
  function createStream(): AsyncIterable<string>;

  // Classes
  class Cat {
    name: string;
    constructor(name: string);
  }
  class ValidationError extends Error {}

  // Collaborators and their mocks
  const db: { clear(): void };
  const fs: typeof import("node:fs");
  const userService: { validateAge(age: number): boolean; createUser(input: { name: string }): Promise<User> };
  const userRepository: { save: Mock<(user: Partial<User>) => Promise<Partial<User>>> };
  const validator: { validate: Mock<(input: unknown) => boolean> };
  const mapper: { toEntity: Mock<(dto: unknown) => Partial<User>> };

  // React components and Testing Library
  const renderer: typeof import("react-test-renderer");
  const render: typeof import("@testing-library/react").render;
  const getByText: RenderResult["getByText"];
  const getByTestId: RenderResult["getByTestId"];
  function Page(): ReactNode;
  function EntirePage(): ReactNode;
  function Header(): ReactNode;
  function Sidebar(): ReactNode;
  function Dashboard(props: { user?: string }): ReactNode;
  function Button(props: { label?: string; children?: ReactNode }): ReactNode;
}
// references/matchers.md adds toBeWithinRange with expect.extend and shows this declaration for it.
declare module "expect" {
  interface AsymmetricMatchers {
    toBeWithinRange(floor: number, ceiling: number): void;
  }
  interface Matchers<R> {
    toBeWithinRange(floor: number, ceiling: number): R;
  }
}
export {};
