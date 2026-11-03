// Stands in for ./userService. The example that imports it mocks it first.
import type { Mock } from "jest-mock";

export declare const getUser: Mock<() => { id: number; name: string }>;
