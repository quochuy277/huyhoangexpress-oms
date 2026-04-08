import { describe, expect, it } from "vitest";

import { shouldFetchTodoBootstrap } from "@/lib/todo-bootstrap-state";

describe("shouldFetchTodoBootstrap", () => {
  it("skips the first client fetch when bootstrap data exists", () => {
    expect(shouldFetchTodoBootstrap({ todos: [] })).toBe(false);
  });

  it("allows the first client fetch when bootstrap data is missing", () => {
    expect(shouldFetchTodoBootstrap(null)).toBe(true);
  });
});
