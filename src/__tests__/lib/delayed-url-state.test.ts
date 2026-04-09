import { describe, expect, it } from "vitest";

import {
  buildDelayedApiSearchParams,
  buildDelayedRouteSearchParams,
  createDelayedViewStateFromSearchParams,
} from "@/lib/delayed-url-state";

describe("delayed-url-state", () => {
  it("hydrates delayed view state from URL search params", () => {
    const state = createDelayedViewStateFromSearchParams(
      new URLSearchParams(
        "page=3&search=REQ-001&shop=Shop+A&status=Ho%C3%A3n+giao+h%C3%A0ng&delay=4%2B&reason=Kh%C3%B4ng+li%C3%AAn+l%E1%BA%A1c+%C4%91%C6%B0%E1%BB%A3c+KH&risk=high&today=1&sortKey=codAmount&sortDir=asc",
      ),
    );

    expect(state).toEqual({
      page: 3,
      pageSize: 50,
      sortKey: "codAmount",
      sortDir: "asc",
      filters: {
        searchTerm: "REQ-001",
        shopFilter: "Shop A",
        statusFilter: "Hoãn giao hàng",
        delayCountFilter: "4+",
        reasonFilter: "Không liên lạc được KH",
        riskFilter: "high",
        todayOnly: true,
      },
    });
  });

  it("builds compact route params for browser history", () => {
    const params = buildDelayedRouteSearchParams({
      page: 1,
      pageSize: 50,
      sortKey: "delayCount",
      sortDir: "desc",
      filters: {
        searchTerm: "",
        shopFilter: "",
        statusFilter: "",
        delayCountFilter: "",
        reasonFilter: "",
        riskFilter: "all",
        todayOnly: false,
      },
    });

    expect(params.toString()).toBe("");
  });

  it("builds API params with paging, sorting and non-empty filters", () => {
    const params = buildDelayedApiSearchParams({
      page: 2,
      pageSize: 50,
      sortKey: "riskScore",
      sortDir: "asc",
      filters: {
        searchTerm: "REQ-009",
        shopFilter: "Shop B",
        statusFilter: "",
        delayCountFilter: "2",
        reasonFilter: "",
        riskFilter: "medium",
        todayOnly: true,
      },
    });

    expect(params.toString()).toBe(
      "page=2&pageSize=50&sortKey=riskScore&sortDir=asc&search=REQ-009&shop=Shop+B&delay=2&risk=medium&today=1",
    );
  });
});
