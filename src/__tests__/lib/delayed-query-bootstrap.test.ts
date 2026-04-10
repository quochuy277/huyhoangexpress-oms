import { describe, expect, it } from "vitest";

import { getDelayedQueryBootstrap } from "@/lib/delayed-query-bootstrap";

describe("delayed-query-bootstrap", () => {
  it("reuses server data only for the initial delayed query", () => {
    const initialData = { rows: [1, 2, 3] };
    const initialDataUpdatedAt = 123456789;

    expect(
      getDelayedQueryBootstrap({
        currentQueryString: "page=1&sortKey=delayCount&sortDir=desc",
        initialQueryString: "page=1&sortKey=delayCount&sortDir=desc",
        initialData,
        initialDataUpdatedAt,
      }),
    ).toEqual({
      initialData,
      initialDataUpdatedAt,
    });

    expect(
      getDelayedQueryBootstrap({
        currentQueryString: "page=1&sortKey=delayCount&sortDir=desc&status=delayed",
        initialQueryString: "page=1&sortKey=delayCount&sortDir=desc",
        initialData,
        initialDataUpdatedAt,
      }),
    ).toEqual({
      initialData: undefined,
      initialDataUpdatedAt: undefined,
    });
  });

  it("skips bootstrap when the server did not provide delayed data", () => {
    expect(
      getDelayedQueryBootstrap({
        currentQueryString: "page=1",
        initialQueryString: "page=1",
        initialData: null,
        initialDataUpdatedAt: 123456789,
      }),
    ).toEqual({
      initialData: undefined,
      initialDataUpdatedAt: undefined,
    });
  });
});
