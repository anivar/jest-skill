// Stands in for ./api and ./api.mjs. Every example that imports it mocks it first, so each export is typed as
// the Jest mock the example receives.
import type { Mock } from "jest-mock";

export declare const fetchUser: Mock<(id?: number) => unknown>;
export declare const fetchPosts: Mock<(userId?: number) => unknown>;
